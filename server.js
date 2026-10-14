import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { calculate, validateRules, validateScope } from './pricing.js'

const root = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'data'))
fs.mkdirSync(dataDir, { recursive: true })
const db = new DatabaseSync(path.join(dataDir, 'kompas.sqlite'))
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, session_id TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rules (version INTEGER PRIMARY KEY, value TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, token_expires_at TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE, contact TEXT NOT NULL, scope TEXT NOT NULL, result TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Baru', owner TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY, request_id TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT 'admin');
CREATE INDEX IF NOT EXISTS idx_events_kind_date ON events(kind, created_at);
CREATE INDEX IF NOT EXISTS idx_requests_date ON requests(created_at);`)
if (!db.prepare('PRAGMA table_info(requests)').all().some(column => column.name === 'details')) db.exec("ALTER TABLE requests ADD COLUMN details TEXT NOT NULL DEFAULT '{}'")
if (!db.prepare('PRAGMA table_info(sessions)').all().some(column => column.name === 'email')) db.exec("ALTER TABLE sessions ADD COLUMN email TEXT NOT NULL DEFAULT ''")
if (!db.prepare('PRAGMA table_info(sessions)').all().some(column => column.name === 'role')) db.exec("ALTER TABLE sessions ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'")
if (!db.prepare('PRAGMA table_info(events)').all().some(column => column.name === 'session_id')) db.exec("ALTER TABLE events ADD COLUMN session_id TEXT NOT NULL DEFAULT ''")

const now = () => new Date().toISOString()
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const random = () => crypto.randomBytes(32).toString('base64url')
const json = (res, status, value, headers = {}) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }); res.end(JSON.stringify(value)) }
const error = (res, status, message) => json(res, status, { error: message })
const parseBody = async req => {
  let text = ''
  for await (const chunk of req) {
    text += chunk
    if (text.length > 100000) throw new Error('Data terlalu besar.')
  }
  try { return JSON.parse(text || '{}') } catch { throw new Error('Format data tidak valid.') }
}
const cookie = req => Object.fromEntries((req.headers.cookie || '').split(';').map(part => part.trim().split('=')).filter(parts => parts.length === 2))
const admin = req => {
  const token = cookie(req).kompas_session
  if (!token) return null
  return db.prepare('SELECT email,role FROM sessions WHERE token_hash=? AND expires_at>?').get(hash(token), now()) || null
}
const requireAdmin = (req, res, roles = ['admin', 'sales', 'reviewer', 'pricing']) => { const user = admin(req); if (!user) { error(res, 401, 'Silakan masuk sebagai admin.'); return false } if (!roles.includes(user.role)) { error(res, 403, 'Anda tidak memiliki akses ke fitur ini.'); return false } return true }
const accounts = [
  { role: 'admin', email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  { role: 'sales', email: process.env.SALES_EMAIL, password: process.env.SALES_PASSWORD },
  { role: 'reviewer', email: process.env.REVIEWER_EMAIL, password: process.env.REVIEWER_PASSWORD },
  { role: 'pricing', email: process.env.PRICING_EMAIL, password: process.env.PRICING_PASSWORD }
].filter(item => item.email && item.password?.length >= 16)
const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''
const sessionCookie = (value, age) => `kompas_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure}`
const currentRules = () => {
  const row = db.prepare('SELECT version,value FROM rules ORDER BY version DESC LIMIT 1').get()
  return row ? { version: row.version, rules: JSON.parse(row.value) } : { version: null, rules: null }
}
function recordEvent(kind, sessionId) {
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(sessionId || '')) throw new Error('Sesi formulir tidak valid.')
  db.prepare('INSERT INTO events(kind,session_id,created_at) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM events WHERE kind=? AND session_id=?)').run(kind, sessionId, now(), kind, sessionId)
}
const rateState = new Map()
function limited(req, name, max = 40) {
  const key = `${req.socket.remoteAddress}:${name}`
  const time = Date.now()
  const state = rateState.get(key) || { start: time, count: 0 }
  if (time - state.start > 60000) { state.start = time; state.count = 0 }
  state.count++
  rateState.set(key, state)
  return state.count > max
}
const route = async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const pathname = url.pathname
  if (pathname.startsWith('/api/')) {
    if (req.method !== 'GET' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return error(res, 403, 'Asal permintaan tidak diizinkan.')
    if (req.method !== 'GET' && limited(req, pathname, pathname === '/api/admin/login' ? 8 : 40)) return error(res, 429, 'Terlalu banyak permintaan. Coba lagi sebentar.')
    if (req.method === 'GET' && pathname === '/api/health') return json(res, 200, { ok: true })
    if (req.method === 'POST' && pathname === '/api/events/start') { recordEvent('start', String((await parseBody(req)).sessionId || '')); return json(res, 201, { ok: true }) }
    if (req.method === 'POST' && pathname === '/api/estimate') {
      const body = await parseBody(req)
      const scope = validateScope(body)
      const { version, rules } = currentRules()
      const result = calculate(scope, rules, version)
      recordEvent('complete', String(body.sessionId || ''))
      return json(res, 200, { scope, result })
    }
    if (req.method === 'POST' && pathname === '/api/requests') {
      const body = await parseBody(req)
      const scope = validateScope(body.scope)
      const contact = {
        name: String(body.contact?.name || '').trim().slice(0, 120),
        company: String(body.contact?.company || '').trim().slice(0, 160),
        email: String(body.contact?.email || '').trim().toLowerCase().slice(0, 254)
      }
      if (!contact.name || !contact.company || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) || body.consent !== true) throw new Error('Lengkapi nama, perusahaan, email, dan persetujuan kontak.')
      const key = String(body.idempotencyKey || '')
      if (!/^[a-zA-Z0-9_-]{16,100}$/.test(key)) throw new Error('Kunci permintaan tidak valid.')
      const existing = db.prepare('SELECT id FROM requests WHERE idempotency_key=?').get(key)
      if (existing) return json(res, 200, { id: existing.id, duplicate: true })
      const { version, rules } = currentRules()
      const result = calculate(scope, rules, version)
      const id = `KMP-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
      const token = random()
      const created = now()
      const expires = new Date(Date.now() + 30 * 86400000).toISOString()
      db.prepare('INSERT INTO requests(id,token_hash,token_expires_at,idempotency_key,contact,scope,result,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id, hash(token), expires, key, JSON.stringify({ ...contact, consentAt: created }), JSON.stringify(scope), JSON.stringify(result), created, created)
      db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run(id, 'created', 'Permintaan proposal masuk', created)
      db.prepare('INSERT INTO events(kind,created_at) VALUES(?,?)').run('proposal', created)
      return json(res, 201, { id, token })
    }
    const privateMatch = pathname.match(/^\/api\/requests\/(KMP-[A-Z0-9-]+)$/)
    if (privateMatch && ['GET', 'PATCH'].includes(req.method)) {
      const row = db.prepare('SELECT id,token_hash,token_expires_at,contact,scope,result,details,status,created_at FROM requests WHERE id=?').get(privateMatch[1])
      if (!row || row.token_expires_at < now() || !crypto.timingSafeEqual(Buffer.from(row.token_hash), Buffer.from(hash(url.searchParams.get('token') || '')))) return error(res, 404, 'Tautan tidak tersedia atau sudah kedaluwarsa.')
      if (req.method === 'GET') return json(res, 200, { id: row.id, contact: JSON.parse(row.contact), scope: JSON.parse(row.scope), result: JSON.parse(row.result), details: JSON.parse(row.details), status: row.status, createdAt: row.created_at })
      if (req.method === 'PATCH') {
        const body = await parseBody(req)
        const clean = {}
        for (const key of ['targets', 'inScope', 'outOfScope', 'documentation', 'deadline']) clean[key] = String(body[key] || '').trim().slice(0, key === 'targets' ? 4000 : 2000)
        db.prepare('UPDATE requests SET details=?,updated_at=? WHERE id=?').run(JSON.stringify(clean), now(), row.id)
        db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run(row.id, 'details', 'Klien melengkapi informasi cakupan', now())
        return json(res, 200, { ok: true })
      }
    }
    if (req.method === 'POST' && pathname === '/api/admin/login') {
      const body = await parseBody(req)
      const account = accounts.find(item => item.email.toLowerCase() === String(body.email || '').toLowerCase())
      if (!account || !crypto.timingSafeEqual(Buffer.from(hash(String(body.password || ''))), Buffer.from(hash(account.password)))) return error(res, 401, 'Email atau password tidak sesuai.')
      const token = random()
      db.prepare('INSERT INTO sessions(token_hash,expires_at,email,role) VALUES(?,?,?,?)').run(hash(token), new Date(Date.now() + 8 * 3600000).toISOString(), account.email, account.role)
      return json(res, 200, { ok: true, role: account.role }, { 'set-cookie': sessionCookie(token, 8 * 3600) })
    }
    if (req.method === 'POST' && pathname === '/api/admin/logout') {
      if (cookie(req).kompas_session) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(cookie(req).kompas_session))
      return json(res, 200, { ok: true }, { 'set-cookie': sessionCookie('', 0) })
    }
    if (pathname.startsWith('/api/admin/') && !requireAdmin(req, res)) return
    if (req.method === 'GET' && pathname === '/api/admin/me') return json(res, 200, admin(req))
    if (req.method === 'GET' && pathname === '/api/admin/summary') {
      const from = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('from') || '') ? `${url.searchParams.get('from')}T00:00:00.000Z` : '1970-01-01T00:00:00.000Z'
      const to = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('to') || '') ? `${url.searchParams.get('to')}T23:59:59.999Z` : now()
      const events = db.prepare('SELECT kind,COUNT(*) count FROM events WHERE created_at BETWEEN ? AND ? GROUP BY kind').all(from, to)
      const requests = db.prepare('SELECT id,contact,scope,result,status,owner,created_at FROM requests WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC LIMIT 500').all(from, to)
      return json(res, 200, { counts: Object.fromEntries(events.map(row => [row.kind, row.count])), requests: requests.map(row => ({ id: row.id, contact: JSON.parse(row.contact), scope: JSON.parse(row.scope), result: JSON.parse(row.result), status: row.status, owner: row.owner, createdAt: row.created_at })) })
    }
    if (req.method === 'GET' && pathname === '/api/admin/export') {
      if (!requireAdmin(req, res, ['admin', 'sales'])) return
      const rows = db.prepare('SELECT id,contact,scope,result,status,owner,created_at FROM requests ORDER BY created_at DESC').all()
      const cell = value => { const text = String(value ?? ''); const safe = /^[\s]*[=+@\-]/.test(text) ? `'${text}` : text; return `"${safe.replaceAll('"', '""')}"` }
      const columns = ['Referensi', 'Tanggal UTC', 'Perusahaan', 'Nama', 'Email', 'Objek', 'Status', 'Penanggung jawab', 'Hasil', 'Harga minimum', 'Harga maksimum']
      const lines = rows.map(row => { const contact = JSON.parse(row.contact); const scope = JSON.parse(row.scope); const result = JSON.parse(row.result); return [row.id,row.created_at,contact.company,contact.name,contact.email,scope.objects.map(o=>`${o.type}:${o.count}`).join('; '),row.status,row.owner,result.status,result.low,result.high].map(cell).join(',') })
      res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="kompas-permintaan.csv"', 'cache-control': 'no-store' })
      return res.end('\ufeff' + [columns.map(cell).join(','), ...lines].join('\r\n'))
    }
    const adminRequest = pathname.match(/^\/api\/admin\/requests\/(KMP-[A-Z0-9-]+)$/)
    if (adminRequest && req.method === 'GET') {
      const row = db.prepare('SELECT * FROM requests WHERE id=?').get(adminRequest[1])
      if (!row) return error(res, 404, 'Permintaan tidak ditemukan.')
      const activity = db.prepare('SELECT action,detail,created_at FROM activity WHERE request_id=? ORDER BY id DESC').all(row.id)
      return json(res, 200, { id: row.id, contact: JSON.parse(row.contact), scope: JSON.parse(row.scope), result: JSON.parse(row.result), details: JSON.parse(row.details), status: row.status, owner: row.owner, notes: row.notes, createdAt: row.created_at, activity })
    }
    if (adminRequest && req.method === 'PATCH') {
      if (!requireAdmin(req, res, ['admin', 'sales', 'reviewer'])) return
      const body = await parseBody(req)
      const allowed = ['Baru', 'Perlu ditinjau', 'Dihubungi', 'Proposal dikirim', 'Menang', 'Tidak lanjut']
      if (!allowed.includes(body.status)) throw new Error('Status tidak valid.')
      const owner = String(body.owner || '').trim().slice(0, 120)
      const notes = String(body.notes || '').trim().slice(0, 4000)
      const changed = db.prepare('UPDATE requests SET status=?,owner=?,notes=?,updated_at=? WHERE id=?').run(body.status, owner, notes, now(), adminRequest[1])
      if (!changed.changes) return error(res, 404, 'Permintaan tidak ditemukan.')
      db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run(adminRequest[1], 'updated', `Status: ${body.status}; penanggung jawab: ${owner}`, now())
      return json(res, 200, { ok: true })
    }
    if (req.method === 'GET' && pathname === '/api/admin/rules') { if (!requireAdmin(req, res, ['admin', 'pricing'])) return; return json(res, 200, currentRules()) }
    if (req.method === 'POST' && pathname === '/api/admin/rules') {
      if (!requireAdmin(req, res, ['admin', 'pricing'])) return
      const rules = validateRules(await parseBody(req))
      const version = (currentRules().version || 0) + 1
      db.prepare('INSERT INTO rules(version,value,created_at) VALUES(?,?,?)').run(version, JSON.stringify(rules), now())
      db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run('PRICING', 'rules', `Versi ${version} diterbitkan oleh ${admin(req).email}`, now())
      return json(res, 201, { version, rules })
    }
    return error(res, 404, 'Alamat API tidak ditemukan.')
  }
  const file = pathname === '/admin' ? 'admin.html' : pathname === '/' ? 'index.html' : pathname.replace(/^\//, '')
  if (!['index.html', 'admin.html', 'app.js', 'admin.js', 'style.css', 'assets/logo-white.png', 'assets/logo-black.png'].includes(file)) return error(res, 404, 'Halaman tidak ditemukan.')
  const full = path.join(root, 'public', file)
  try {
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'text/html'
    res.writeHead(200, { 'content-type': `${type}; charset=utf-8`, 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'" })
    fs.createReadStream(full).pipe(res)
  } catch { error(res, 404, 'Berkas tidak ditemukan.') }
}

const server = http.createServer((req, res) => { route(req, res).catch(err => error(res, err.message === 'Data terlalu besar.' ? 413 : 400, err.message || 'Terjadi kesalahan.')) })
const port = Number(process.env.PORT || 4173)
server.listen(port, () => console.log(`KOMPAS berjalan di http://localhost:${port}`))
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => { db.close(); process.exit(0) }))

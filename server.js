import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import { calculate, validateRules, validateScope } from './pricing.js'

const root = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'data'))
fs.mkdirSync(dataDir, { recursive: true })
const db = new DatabaseSync(path.join(dataDir, 'kompas.sqlite'))
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, session_id TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rules (version INTEGER PRIMARY KEY, value TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published', created_at TEXT NOT NULL, published_at TEXT);
CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, token_expires_at TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE, contact TEXT NOT NULL, scope TEXT NOT NULL, result TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Baru', owner TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS activity (id INTEGER PRIMARY KEY, request_id TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT 'admin');
CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, role TEXT NOT NULL, password_hash TEXT, status TEXT NOT NULL, is_owner INTEGER NOT NULL DEFAULT 0, invite_hash TEXT, invite_expires_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_events_kind_date ON events(kind, created_at);
CREATE INDEX IF NOT EXISTS idx_requests_date ON requests(created_at);`)
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_hash ON users(invite_hash)')
if (!db.prepare('PRAGMA table_info(requests)').all().some(column => column.name === 'details')) db.exec("ALTER TABLE requests ADD COLUMN details TEXT NOT NULL DEFAULT '{}'")
for (const [column, definition] of [['offer_price', 'INTEGER'], ['offer_summary', "TEXT NOT NULL DEFAULT ''"], ['offer_valid_until', "TEXT NOT NULL DEFAULT ''"], ['offer_published_at', 'TEXT'], ['access_code_hash', 'TEXT'], ['access_code_expires_at', 'TEXT']]) {
  if (!db.prepare('PRAGMA table_info(requests)').all().some(item => item.name === column)) db.exec(`ALTER TABLE requests ADD COLUMN ${column} ${definition}`)
}
db.exec('CREATE INDEX IF NOT EXISTS idx_requests_access_code ON requests(access_code_hash)')
if (!db.prepare('PRAGMA table_info(sessions)').all().some(column => column.name === 'email')) db.exec("ALTER TABLE sessions ADD COLUMN email TEXT NOT NULL DEFAULT ''")
if (!db.prepare('PRAGMA table_info(sessions)').all().some(column => column.name === 'role')) db.exec("ALTER TABLE sessions ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'")
if (!db.prepare('PRAGMA table_info(events)').all().some(column => column.name === 'session_id')) db.exec("ALTER TABLE events ADD COLUMN session_id TEXT NOT NULL DEFAULT ''")
if (!db.prepare('PRAGMA table_info(rules)').all().some(column => column.name === 'status')) db.exec("ALTER TABLE rules ADD COLUMN status TEXT NOT NULL DEFAULT 'published'")
if (!db.prepare('PRAGMA table_info(rules)').all().some(column => column.name === 'published_at')) db.exec("ALTER TABLE rules ADD COLUMN published_at TEXT")
if (!db.prepare('SELECT 1 FROM rules LIMIT 1').get() && process.env.PRICING_SEED_JSON) {
  const seed = validateRules(JSON.parse(process.env.PRICING_SEED_JSON))
  db.prepare('INSERT INTO rules(version,value,status,created_at) VALUES(?,?,?,?)').run(1, JSON.stringify(seed), 'draft', new Date().toISOString())
}

const now = () => new Date().toISOString()
const hash = value => crypto.createHash('sha256').update(value).digest('hex')
const random = () => crypto.randomBytes(32).toString('base64url')
const passwordHash = password => { const salt = crypto.randomBytes(16).toString('hex'); return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}` }
const passwordMatches = (password, stored) => {
  if (!stored) return false
  const [salt, value] = stored.split(':')
  if (!/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(value || '')) return false
  return crypto.timingSafeEqual(crypto.scryptSync(password, salt, 64), Buffer.from(value, 'hex'))
}
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
  return db.prepare("SELECT users.email,users.role,users.is_owner AS owner FROM sessions JOIN users ON users.email=sessions.email WHERE sessions.token_hash=? AND sessions.expires_at>? AND users.status='active'").get(hash(token), now()) || null
}
const requireAdmin = (req, res, roles = ['admin', 'sales', 'reviewer', 'pricing']) => { const user = admin(req); if (!user) { error(res, 401, 'Silakan masuk sebagai admin.'); return false } if (!roles.includes(user.role)) { error(res, 403, 'Anda tidak memiliki akses ke fitur ini.'); return false } return true }
const requireOwner = (req, res) => { if (!requireAdmin(req, res)) return false; if (!admin(req).owner) { error(res, 403, 'Hanya pemilik sistem yang dapat mengelola pengguna.'); return false } return true }
const accounts = [
  { role: 'admin', email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  { role: 'sales', email: process.env.SALES_EMAIL, password: process.env.SALES_PASSWORD },
  { role: 'reviewer', email: process.env.REVIEWER_EMAIL, password: process.env.REVIEWER_PASSWORD },
  { role: 'pricing', email: process.env.PRICING_EMAIL, password: process.env.PRICING_PASSWORD }
].filter(item => item.email && item.password?.length >= 16)
if (!db.prepare('SELECT 1 FROM users LIMIT 1').get()) {
  const insert = db.prepare('INSERT INTO users(email,role,password_hash,status,is_owner,created_at,updated_at) VALUES(?,?,?,?,?,?,?)')
  for (const account of accounts) insert.run(account.email.trim().toLowerCase(), account.role, passwordHash(account.password), 'active', account.role === 'admin' ? 1 : 0, now(), now())
}
const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''
const sessionCookie = (value, age) => `kompas_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure}`
const currentRules = () => {
  const row = db.prepare("SELECT version,value FROM rules WHERE status='published' ORDER BY version DESC LIMIT 1").get()
  return row ? { version: row.version, rules: JSON.parse(row.value) } : { version: null, rules: null }
}
const latestDraft = () => {
  const publishedVersion = currentRules().version || 0
  const row = db.prepare("SELECT version,value FROM rules WHERE status='draft' AND version>? ORDER BY version DESC LIMIT 1").get(publishedVersion)
  return row ? { version: row.version, rules: JSON.parse(row.value) } : null
}
function recordEvent(kind, sessionId) {
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(sessionId || '')) throw new Error('Sesi formulir tidak valid.')
  db.prepare('INSERT INTO events(kind,session_id,created_at) SELECT ?,?,? WHERE NOT EXISTS(SELECT 1 FROM events WHERE kind=? AND session_id=?)').run(kind, sessionId, now(), kind, sessionId)
}
const rateState = new Map()
const clientIp = req => {
  const direct = req.socket.remoteAddress || 'unknown'
  if (process.env.TRUST_PROXY !== 'true') return direct
  const forwarded = req.headers['x-forwarded-for']
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded || '').split(',')[0].trim()
  return net.isIP(first) ? first : direct
}
function limited(req, name, max, windowMs = 60000) {
  const key = `${clientIp(req)}:${name}`
  const time = Date.now()
  const state = rateState.get(key) || { start: time, count: 0 }
  if (time - state.start >= windowMs) { state.start = time; state.count = 0 }
  state.count++
  rateState.set(key, state)
  return state.count > max
}
setInterval(() => {
  const time = Date.now()
  for (const [key, state] of rateState) if (time - state.start > 3600000) rateState.delete(key)
}, 60000).unref()
const route = async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const pathname = url.pathname
  if (pathname.startsWith('/api/')) {
    if (req.method !== 'GET' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return error(res, 403, 'Asal permintaan tidak diizinkan.')
    if (limited(req, 'api-all', 180)) return error(res, 429, 'Terlalu banyak permintaan. Coba lagi sebentar.')
    const routeLimit = pathname === '/api/admin/login' ? 8 : pathname === '/api/requests' && req.method === 'POST' ? 10 : pathname === '/api/tickets/resolve' ? 20 : pathname.startsWith('/api/requests/') ? 60 : 40
    if (limited(req, `${req.method}:${pathname}`, routeLimit)) return error(res, 429, 'Terlalu banyak permintaan. Coba lagi sebentar.')
    if (pathname === '/api/requests' && req.method === 'POST' && limited(req, 'proposal-hour', 30, 3600000)) return error(res, 429, 'Terlalu banyak permintaan proposal. Coba lagi nanti.')
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
      if (String(body.website || '').trim()) return error(res, 400, 'Permintaan tidak dapat diproses.')
      const scope = validateScope(body.scope)
      const contact = {
        name: String(body.contact?.name || '').trim().slice(0, 120),
        position: String(body.contact?.position || '').trim().slice(0, 120),
        company: String(body.contact?.company || '').trim().slice(0, 160),
        email: String(body.contact?.email || '').trim().toLowerCase().slice(0, 254),
        phone: String(body.contact?.phone || '').trim().slice(0, 25)
      }
      if (!contact.name || !contact.company || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) || body.consent !== true) throw new Error('Lengkapi nama, perusahaan, email, dan persetujuan kontak.')
      if (contact.phone && !/^\+?[0-9 ()-]{8,25}$/.test(contact.phone)) throw new Error('Nomor telepon tidak valid.')
      const key = String(body.idempotencyKey || '')
      if (!/^[a-zA-Z0-9_-]{16,100}$/.test(key)) throw new Error('Kunci permintaan tidak valid.')
      const existing = db.prepare('SELECT id,token_hash,token_expires_at FROM requests WHERE idempotency_key=?').get(key)
      if (existing) return json(res, 200, { id: existing.id, ...( /^KMP-\d{4}-[A-F0-9]{32}$/.test(existing.id) && existing.token_hash === hash(existing.id) && existing.token_expires_at > now() ? { token: existing.id } : {}), duplicate: true })
      const { version, rules } = currentRules()
      const result = calculate(scope, rules, version)
      const id = `KMP-${new Date().getFullYear()}-${crypto.randomBytes(16).toString('hex').toUpperCase()}`
      const token = id
      const created = now()
      const expires = new Date(Date.now() + 30 * 86400000).toISOString()
      db.prepare('INSERT INTO requests(id,token_hash,token_expires_at,access_code_hash,access_code_expires_at,idempotency_key,contact,scope,result,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id, hash(token), expires, hash(id), expires, key, JSON.stringify({ ...contact, consentAt: created }), JSON.stringify(scope), JSON.stringify(result), created, created)
      db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run(id, 'created', 'Permintaan proposal masuk', created)
      db.prepare('INSERT INTO events(kind,created_at) VALUES(?,?)').run('proposal', created)
      return json(res, 201, { id, token })
    }
    if (req.method === 'POST' && pathname === '/api/tickets/resolve') {
      const code = String((await parseBody(req)).code || '').trim().toUpperCase()
      if (!/^KMP-\d{4}-[A-F0-9]{32}$/.test(code)) return error(res, 404, 'Nomor tiket tidak tersedia atau sudah kedaluwarsa.')
      const row = db.prepare('SELECT id FROM requests WHERE access_code_hash=? AND access_code_expires_at>?').get(hash(code), now())
      if (!row) return error(res, 404, 'Nomor tiket tidak tersedia atau sudah kedaluwarsa.')
      return json(res, 200, { id: row.id })
    }
    const privateMatch = pathname.match(/^\/api\/requests\/(KMP-[A-Z0-9-]+)$/)
    if (privateMatch && ['GET', 'PATCH'].includes(req.method)) {
      const row = db.prepare('SELECT id,token_hash,token_expires_at,access_code_hash,access_code_expires_at,contact,scope,result,details,status,created_at,offer_price,offer_summary,offer_valid_until,offer_published_at FROM requests WHERE id=?').get(privateMatch[1])
      const candidate = hash(url.searchParams.get('token') || '')
      const validOriginal = row && row.token_expires_at >= now() && crypto.timingSafeEqual(Buffer.from(row.token_hash), Buffer.from(candidate))
      const validCode = row?.access_code_hash && row.access_code_expires_at >= now() && crypto.timingSafeEqual(Buffer.from(row.access_code_hash), Buffer.from(candidate))
      if (!validOriginal && !validCode) return error(res, 404, 'Tautan tidak tersedia atau sudah kedaluwarsa.')
      if (req.method === 'GET') return json(res, 200, { id: row.id, contact: JSON.parse(row.contact), scope: JSON.parse(row.scope), result: JSON.parse(row.result), details: JSON.parse(row.details), status: row.status, createdAt: row.created_at, offer: row.offer_published_at ? { price: row.offer_price, summary: row.offer_summary, validUntil: row.offer_valid_until, publishedAt: row.offer_published_at } : null })
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
      const account = db.prepare("SELECT email,role,password_hash FROM users WHERE email=? AND status='active'").get(String(body.email || '').trim().toLowerCase())
      const password = String(body.password || '')
      if (password.length > 128 || !account || !passwordMatches(password, account.password_hash)) return error(res, 401, 'Email atau password tidak sesuai.')
      const token = random()
      db.prepare('INSERT INTO sessions(token_hash,expires_at,email,role) VALUES(?,?,?,?)').run(hash(token), new Date(Date.now() + 8 * 3600000).toISOString(), account.email, account.role)
      return json(res, 200, { ok: true, role: account.role }, { 'set-cookie': sessionCookie(token, 8 * 3600) })
    }
    if (req.method === 'POST' && pathname === '/api/admin/invitations/accept') {
      const body = await parseBody(req)
      const token = String(body.token || '')
      const password = String(body.password || '')
      if (!/^[a-zA-Z0-9_-]{40,100}$/.test(token) || password.length < 16 || password.length > 128) return error(res, 400, 'Undangan atau password tidak valid. Gunakan password 16–128 karakter.')
      const invited = db.prepare("SELECT email FROM users WHERE invite_hash=? AND invite_expires_at>? AND status='pending'").get(hash(token), now())
      if (!invited) return error(res, 400, 'Undangan tidak tersedia atau sudah kedaluwarsa.')
      db.prepare("UPDATE users SET password_hash=?,status='active',invite_hash=NULL,invite_expires_at=NULL,updated_at=? WHERE email=?").run(passwordHash(password), now(), invited.email)
      db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run('USERS', 'user_activated', `Akun ${invited.email} mengaktifkan undangan`, now())
      return json(res, 200, { ok: true })
    }
    if (req.method === 'POST' && pathname === '/api/admin/logout') {
      if (cookie(req).kompas_session) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(cookie(req).kompas_session))
      return json(res, 200, { ok: true }, { 'set-cookie': sessionCookie('', 0) })
    }
    if (pathname.startsWith('/api/admin/') && !requireAdmin(req, res)) return
    if (req.method === 'GET' && pathname === '/api/admin/me') return json(res, 200, admin(req))
    if (req.method === 'POST' && pathname === '/api/admin/password') {
      const body = await parseBody(req)
      const current = String(body.currentPassword || '')
      const replacement = String(body.newPassword || '')
      if (current.length > 128 || replacement.length < 16 || replacement.length > 128 || current === replacement) return error(res, 400, 'Password baru harus berbeda dan berisi 16–128 karakter.')
      const me = admin(req)
      const stored = db.prepare('SELECT password_hash FROM users WHERE email=?').get(me.email)
      if (!passwordMatches(current, stored.password_hash)) return error(res, 400, 'Password saat ini tidak sesuai.')
      db.prepare('UPDATE users SET password_hash=?,updated_at=? WHERE email=?').run(passwordHash(replacement), now(), me.email)
      db.prepare('DELETE FROM sessions WHERE email=?').run(me.email)
      db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run('USERS', 'password_changed', `${me.email} mengganti password dan mencabut semua sesi`, now())
      return json(res, 200, { ok: true })
    }
    if (req.method === 'GET' && pathname === '/api/admin/users') {
      if (!requireOwner(req, res)) return
      return json(res, 200, { users: db.prepare('SELECT email,role,status,is_owner AS owner,invite_expires_at AS inviteExpiresAt,created_at AS createdAt,updated_at AS updatedAt FROM users ORDER BY is_owner DESC,email').all(), activity: db.prepare("SELECT action,detail,created_at AS createdAt FROM activity WHERE request_id='USERS' ORDER BY id DESC LIMIT 50").all() })
    }
    if (req.method === 'POST' && pathname === '/api/admin/users/invite') {
      if (!requireOwner(req, res)) return
      const body = await parseBody(req)
      const email = String(body.email || '').trim().toLowerCase()
      const role = String(body.role || '')
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error(res, 400, 'Email pengguna tidak valid.')
      if (!['admin', 'sales', 'reviewer', 'pricing'].includes(role)) return error(res, 400, 'Peran pengguna tidak valid.')
      const existing = db.prepare('SELECT status,is_owner FROM users WHERE email=?').get(email)
      if (existing?.is_owner || existing?.status === 'active') return error(res, 409, 'Akun sudah aktif. Ubah perannya dari daftar pengguna.')
      const token = random()
      const expiresAt = new Date(Date.now() + 24 * 3600000).toISOString()
      const created = now()
      if (existing) db.prepare("UPDATE users SET role=?,password_hash=NULL,status='pending',invite_hash=?,invite_expires_at=?,updated_at=? WHERE email=?").run(role, hash(token), expiresAt, created, email)
      else db.prepare("INSERT INTO users(email,role,status,invite_hash,invite_expires_at,created_at,updated_at) VALUES(?,?,'pending',?,?,?,?)").run(email, role, hash(token), expiresAt, created, created)
      db.prepare('DELETE FROM sessions WHERE email=?').run(email)
      db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run('USERS', 'user_invited', `${admin(req).email} mengundang ${email} sebagai ${role}`, created)
      return json(res, 201, { token, expiresAt })
    }
    const userAction = pathname.match(/^\/api\/admin\/users\/([^/]+)\/(role|disable|sessions)$/)
    if (userAction && req.method === 'POST') {
      if (!requireOwner(req, res)) return
      const email = decodeURIComponent(userAction[1]).toLowerCase()
      const target = db.prepare('SELECT email,status,is_owner,role FROM users WHERE email=?').get(email)
      if (!target) return error(res, 404, 'Pengguna tidak ditemukan.')
      if (userAction[2] === 'sessions') {
        db.prepare('DELETE FROM sessions WHERE email=?').run(email)
        db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run('USERS', 'sessions_revoked', `${admin(req).email} mencabut sesi ${email}`, now())
        return json(res, 200, { ok: true })
      }
      if (target.is_owner) return error(res, 403, 'Akun pemilik sistem tidak dapat diubah dari halaman ini.')
      if (userAction[2] === 'disable') {
        db.prepare("UPDATE users SET status='disabled',password_hash=NULL,invite_hash=NULL,invite_expires_at=NULL,updated_at=? WHERE email=?").run(now(), email)
        db.prepare('DELETE FROM sessions WHERE email=?').run(email)
        db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run('USERS', 'user_disabled', `${admin(req).email} menonaktifkan ${email}`, now())
        return json(res, 200, { ok: true })
      }
      const role = String((await parseBody(req)).role || '')
      if (!['admin', 'sales', 'reviewer', 'pricing'].includes(role)) return error(res, 400, 'Peran pengguna tidak valid.')
      if (target.status !== 'active') return error(res, 409, 'Aktifkan akun sebelum mengubah peran.')
      db.prepare('UPDATE users SET role=?,updated_at=? WHERE email=?').run(role, now(), email)
      db.prepare('DELETE FROM sessions WHERE email=?').run(email)
      db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run('USERS', 'user_role_changed', `${admin(req).email} mengubah peran ${email}: ${target.role} menjadi ${role}`, now())
      return json(res, 200, { ok: true })
    }
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
      const columns = ['Referensi', 'Tanggal UTC', 'Perusahaan', 'Nama', 'Jabatan', 'Email', 'Telepon', 'Objek', 'Status', 'Penanggung jawab', 'Hasil', 'Harga minimum', 'Harga maksimum']
      const lines = rows.map(row => { const contact = JSON.parse(row.contact); const scope = JSON.parse(row.scope); const result = JSON.parse(row.result); return [row.id,row.created_at,contact.company,contact.name,contact.position,contact.email,contact.phone,scope.objects.map(o=>`${o.type}:${o.count}`).join('; '),row.status,row.owner,result.status,result.low,result.high].map(cell).join(',') })
      res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="kompas-permintaan.csv"', 'cache-control': 'no-store' })
      return res.end('\ufeff' + [columns.map(cell).join(','), ...lines].join('\r\n'))
    }
    const adminRequest = pathname.match(/^\/api\/admin\/requests\/(KMP-[A-Z0-9-]+)$/)
    if (adminRequest && req.method === 'GET') {
      const row = db.prepare('SELECT * FROM requests WHERE id=?').get(adminRequest[1])
      if (!row) return error(res, 404, 'Permintaan tidak ditemukan.')
      const activity = db.prepare('SELECT action,detail,created_at FROM activity WHERE request_id=? ORDER BY id DESC').all(row.id)
      return json(res, 200, { id: row.id, contact: JSON.parse(row.contact), scope: JSON.parse(row.scope), result: JSON.parse(row.result), details: JSON.parse(row.details), status: row.status, owner: row.owner, notes: row.notes, createdAt: row.created_at, offer: { price: row.offer_price, summary: row.offer_summary, validUntil: row.offer_valid_until, publishedAt: row.offer_published_at }, activity })
    }
    if (adminRequest && req.method === 'PATCH') {
      if (!requireAdmin(req, res, ['admin', 'sales', 'reviewer'])) return
      const body = await parseBody(req)
      const allowed = ['Baru', 'Perlu ditinjau', 'Dihubungi', 'Proposal dikirim', 'Menang', 'Tidak lanjut']
      if (!allowed.includes(body.status)) throw new Error('Status tidak valid.')
      if (body.status === 'Proposal dikirim' && !db.prepare('SELECT offer_published_at FROM requests WHERE id=?').get(adminRequest[1])?.offer_published_at) throw new Error('Terbitkan penawaran sebelum mengubah status menjadi Proposal dikirim.')
      const owner = String(body.owner || '').trim().slice(0, 120)
      const notes = String(body.notes || '').trim().slice(0, 4000)
      const changed = db.prepare('UPDATE requests SET status=?,owner=?,notes=?,updated_at=? WHERE id=?').run(body.status, owner, notes, now(), adminRequest[1])
      if (!changed.changes) return error(res, 404, 'Permintaan tidak ditemukan.')
      db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run(adminRequest[1], 'updated', `Status: ${body.status}; penanggung jawab: ${owner}`, now())
      return json(res, 200, { ok: true })
    }
    const accessMatch = pathname.match(/^\/api\/admin\/requests\/(KMP-[A-Z0-9-]+)\/access-code$/)
    if (accessMatch && req.method === 'POST') {
      if (!requireAdmin(req, res, ['admin', 'sales'])) return
      if (!db.prepare('SELECT 1 FROM requests WHERE id=?').get(accessMatch[1])) return error(res, 404, 'Permintaan tidak ditemukan.')
      const code = `KMP-${new Date().getFullYear()}-${crypto.randomBytes(16).toString('hex').toUpperCase()}`
      const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString()
      db.prepare('UPDATE requests SET token_hash=?,token_expires_at=?,access_code_hash=?,access_code_expires_at=?,updated_at=? WHERE id=?').run(hash(code), expiresAt, hash(code), expiresAt, now(), accessMatch[1])
      db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run(accessMatch[1], 'access_code_issued', `Kode akses baru dibuat oleh ${admin(req).email}`, now())
      return json(res, 201, { code, expiresAt })
    }
    const offerMatch = pathname.match(/^\/api\/admin\/requests\/(KMP-[A-Z0-9-]+)\/offer(\/publish)?$/)
    if (offerMatch && req.method === 'POST') {
      if (!requireAdmin(req, res, ['admin', 'sales'])) return
      const row = db.prepare('SELECT offer_price,offer_summary,offer_valid_until,offer_published_at FROM requests WHERE id=?').get(offerMatch[1])
      if (!row) return error(res, 404, 'Permintaan tidak ditemukan.')
      if (row.offer_published_at) return error(res, 409, 'Penawaran sudah diterbitkan dan tidak dapat diubah dari formulir ini.')
      if (offerMatch[2]) {
        const expected = (await parseBody(req)).expected
        if (expected && (Number(expected.price) !== row.offer_price || expected.summary !== row.offer_summary || expected.validUntil !== row.offer_valid_until)) return error(res, 409, 'Draf penawaran berubah. Muat ulang detail dan periksa nilainya sebelum menerbitkan.')
        if (!row.offer_price || !row.offer_summary || !row.offer_valid_until) throw new Error('Simpan rincian penawaran sebelum menerbitkannya.')
        if (row.offer_valid_until < now().slice(0, 10)) throw new Error('Masa berlaku penawaran sudah lewat.')
        const published = now()
        db.prepare("UPDATE requests SET offer_published_at=?,status='Proposal dikirim',updated_at=? WHERE id=?").run(published, published, offerMatch[1])
        db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run(offerMatch[1], 'offer_published', `Penawaran Rp${row.offer_price} diterbitkan di halaman tiket oleh ${admin(req).email}`, published)
        return json(res, 200, { ok: true, publishedAt: published })
      }
      const body = await parseBody(req)
      const price = Number(body.price)
      const summary = String(body.summary || '').trim()
      const validUntil = String(body.validUntil || '')
      if (!Number.isSafeInteger(price) || price < 1 || price > 1000000000000) throw new Error('Harga penawaran tidak valid.')
      if (summary.length < 20 || summary.length > 4000) throw new Error('Ringkasan penawaran harus 20–4.000 karakter.')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil) || Number.isNaN(Date.parse(`${validUntil}T00:00:00Z`)) || validUntil < now().slice(0, 10)) throw new Error('Masa berlaku penawaran tidak valid.')
      db.prepare('UPDATE requests SET offer_price=?,offer_summary=?,offer_valid_until=?,updated_at=? WHERE id=?').run(price, summary, validUntil, now(), offerMatch[1])
      db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run(offerMatch[1], 'offer_draft', `Draf penawaran disimpan oleh ${admin(req).email}`, now())
      return json(res, 200, { ok: true })
    }
    if (req.method === 'GET' && pathname === '/api/admin/rules') { if (!requireAdmin(req, res, ['admin', 'pricing'])) return; return json(res, 200, { published: currentRules(), draft: latestDraft() }) }
    if (req.method === 'POST' && pathname === '/api/admin/rules') {
      if (!requireAdmin(req, res, ['admin', 'pricing'])) return
      const rules = validateRules(await parseBody(req))
      const version = (db.prepare('SELECT MAX(version) version FROM rules').get().version || 0) + 1
      db.prepare('INSERT INTO rules(version,value,status,created_at) VALUES(?,?,?,?)').run(version, JSON.stringify(rules), 'draft', now())
      db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run('PRICING', 'rules', `Draf versi ${version} disimpan oleh ${admin(req).email}`, now())
      return json(res, 201, { version, rules, status: 'draft' })
    }
    if (req.method === 'POST' && pathname === '/api/admin/rules/preview') {
      if (!requireAdmin(req, res, ['admin', 'pricing'])) return
      const rules = validateRules(await parseBody(req))
      const objectNames = { web: 'Web Application', api: 'API', mobile: 'Mobile Application', infra: 'Infrastruktur' }
      const methodNames = { black: 'Black Box', gray: 'Gray Box', white: 'White Box' }
      const base = { objects: [{ type: 'web', count: 1, size: 10 }], method: 'gray', roles: 1, environment: 'staging', access: 'internet', window: 'business' }
      const sample = (name, input) => ({ name, result: calculate(validateScope(input), rules) })
      const samples = Object.entries(objectNames).flatMap(([type, label]) => ['black', 'gray', 'white'].map(method => sample(`${label} · ${methodNames[method]}`, { ...base, objects: [{ type, count: 1, size: 10, ...(type === 'mobile' ? { platform: 'android' } : {}) }], method })))
      const conditions = [
        sample('Web Gray Box · kondisi dasar', base),
        sample('Dua peran pengguna', { ...base, roles: 2 }),
        sample('20 fitur utama', { ...base, objects: [{ type: 'web', count: 1, size: 20 }] }),
        sample('Dua Web Application', { ...base, objects: [{ type: 'web', count: 2, size: 10 }] }),
        sample('Lingkungan production', { ...base, environment: 'production' }),
        sample('Lingkungan lainnya', { ...base, environment: 'other' }),
        sample('Di luar jam kerja', { ...base, window: 'after' }),
        sample('Akses melalui VPN', { ...base, access: 'vpn' }),
        sample('Cara akses belum diketahui', { ...base, access: 'unsure' }),
        sample('Perlu onsite', { ...base, access: 'onsite' }),
        sample('Metode belum dipilih', { ...base, method: 'unsure' }),
        sample('Ukuran cakupan belum diketahui', { ...base, objects: [{ type: 'web', count: 1, size: 'unknown' }] }),
        sample('Jumlah peran belum diketahui', { ...base, roles: 'unknown' }),
        sample('Jadwal perlu dibahas', { ...base, window: 'discuss' }),
        sample('Mobile iOS', { ...base, objects: [{ type: 'mobile', count: 1, size: 10, platform: 'ios' }] }),
        sample('Android dan iOS', { ...base, objects: [{ type: 'mobile', count: 1, size: 10, platform: 'both' }] }),
        sample('Platform mobile belum diketahui', { ...base, objects: [{ type: 'mobile', count: 1, size: 10, platform: 'unknown' }] }),
        sample('Web dan API terpisah', { ...base, objects: [{ type: 'web', count: 1, size: 10 }, { type: 'api', count: 1, size: 10 }], sharedTarget: 'no' }),
        sample('Web dan API berbagi backend', { ...base, objects: [{ type: 'web', count: 1, size: 10 }, { type: 'api', count: 1, size: 10 }], sharedTarget: 'yes' }),
        sample('Hubungan Web dan API belum diketahui', { ...base, objects: [{ type: 'web', count: 1, size: 10 }, { type: 'api', count: 1, size: 10 }], sharedTarget: 'unknown' })
      ]
      return json(res, 200, { samples, conditions })
    }
    if (req.method === 'POST' && pathname === '/api/admin/rules/publish') {
      if (!requireAdmin(req, res, ['admin', 'pricing'])) return
      const version = Number((await parseBody(req)).version)
      const draft = latestDraft()
      if (!draft || version !== draft.version) throw new Error('Terbitkan draf terbaru setelah memeriksa nilainya.')
      db.prepare("UPDATE rules SET status='published',published_at=? WHERE version=? AND status='draft'").run(now(), version)
      db.prepare('INSERT INTO activity(request_id,action,detail,created_at) VALUES(?,?,?,?)').run('PRICING', 'rules', `Versi ${version} diterbitkan oleh ${admin(req).email}`, now())
      return json(res, 200, { version, status: 'published' })
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

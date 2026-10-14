import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { DatabaseSync } from 'node:sqlite'

const rules = { days:{web:3,api:2,mobile:4,infra:2}, methodDays:{black:0,gray:1,white:2}, rate:1000000, minimum:2000000, uncertainty:0.1, extraRoleDays:0.5, productionDays:1, afterHoursDays:1, onsiteDays:1, sizeUnit:10, sizeDays:0.5 }
const scope = (type = 'web') => ({ objects:[{type,count:1,size:10}], method:'black', environment:'staging', access:'internet', window:'business', roles:1 })

async function freePort() {
  const server = net.createServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  return port
}

test('alur lokal klien, admin, dan versi harga', { timeout: 20000 }, async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'kompas-test-'))
  const port = await freePort()
  const base = `http://127.0.0.1:${port}`
  const child = spawn(process.execPath, ['server.js'], { cwd: process.cwd(), env: { ...process.env, PORT:String(port), DATA_DIR:dataDir, ADMIN_EMAIL:'admin@test.local', ADMIN_PASSWORD:'test-password-strong-12345', SALES_EMAIL:'sales@test.local', SALES_PASSWORD:'sales-password-strong-12345', PRICING_EMAIL:'pricing@test.local', PRICING_PASSWORD:'pricing-password-strong-12345', PRICING_SEED_JSON:JSON.stringify(rules), COOKIE_SECURE:'false', TRUST_PROXY:'true' }, stdio:'ignore' })
  const call = async (url, method = 'GET', body, cookie = '') => {
    const response = await fetch(base + url, { method, headers: { ...(body ? { 'content-type':'application/json' } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })
    return { status:response.status, data:await response.json(), cookie:response.headers.get('set-cookie') }
  }
  try {
    let ready = false
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await call('/api/health')).status === 200) { ready = true; break } } catch {}
      if (child.exitCode !== null) break
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    assert.ok(ready, 'server pengujian harus siap')

    for (const type of ['web','api','mobile','infra']) {
      assert.equal((await call('/api/events/start', 'POST', { sessionId:`session-${type}-1234567890` })).status, 201)
      const estimate = await call('/api/estimate', 'POST', { ...scope(type), sessionId:`session-${type}-1234567890` })
      assert.equal(estimate.status, 200)
      assert.equal(estimate.data.result.status, 'review')
      assert.equal(estimate.data.result.low, null)
      assert.ok(estimate.data.result.reasons.every(reason => !reason.includes('Tarif internal')))
    }
    const shared = await call('/api/estimate', 'POST', { ...scope(), objects:[...scope().objects,{type:'api',count:1,size:10}], sharedTarget:'yes', sessionId:'session-shared-1234567890' })
    assert.equal(shared.data.result.days, null)
    const unknown = await call('/api/estimate', 'POST', { ...scope(), objects:[{type:'web',count:1,size:'unknown'}], sessionId:'session-unknown-1234567890' })
    assert.equal(unknown.data.result.status, 'review')

    const contact = { name:'Penguji', position:'Manajer TI', company:'Contoh PT', email:'penguji@example.com', phone:'+62 812 3456 7890' }
    const requestBody = { scope:scope(), contact, consent:true, idempotencyKey:'request-1234567890' }
    assert.equal((await call('/api/requests', 'POST', { ...requestBody, website:'spam.example' })).status, 400)
    assert.equal((await call('/api/requests', 'POST', { ...requestBody, contact:{ ...contact, phone:'telepon tidak valid' } })).status, 400)
    const request = await call('/api/requests', 'POST', requestBody)
    assert.equal(request.status, 201)
    assert.match(request.data.id, /^KMP-\d{4}-[A-F0-9]{32}$/)
    assert.equal(request.data.token, request.data.id)
    const duplicate = await call('/api/requests', 'POST', requestBody)
    assert.equal(duplicate.status, 200)
    assert.equal(duplicate.data.id, request.data.id)
    assert.equal(duplicate.data.token, request.data.id)
    assert.equal(duplicate.data.duplicate, true)
    assert.equal((await call(`/api/requests/${request.data.id}?token=wrong`)).status, 404)
    const privateUrl = `/api/requests/${request.data.id}?token=${encodeURIComponent(request.data.token)}`
    const privateRequest = await call(privateUrl)
    assert.equal(privateRequest.status, 200)
    assert.equal(privateRequest.data.contact.position, 'Manajer TI')
    assert.equal(privateRequest.data.contact.phone, '+62 812 3456 7890')
    assert.equal(privateRequest.data.contact.consentVersion, 'v1-2026-10-14')
    assert.ok(privateRequest.data.contact.consentAt)
    assert.equal((await call('/api/tickets/resolve', 'POST', { code:request.data.id })).data.id, request.data.id)
    assert.equal((await call(privateUrl, 'PATCH', { targets:'contoh.test' })).status, 200)

    assert.equal((await call('/api/admin/summary')).status, 401)
    const login = await call('/api/admin/login', 'POST', { email:'admin@test.local', password:'test-password-strong-12345' })
    assert.equal(login.status, 200)
    const adminCookie = login.cookie.split(';')[0]
    assert.equal((await call('/api/admin/me', 'GET', undefined, adminCookie)).data.owner, 1)
    assert.equal((await call('/api/admin/users')).status, 401)
    const invited = await call('/api/admin/users/invite', 'POST', { email:'teammate@test.local', role:'sales' }, adminCookie)
    assert.equal(invited.status, 201)
    assert.ok(invited.data.token.length >= 40)
    assert.equal((await call('/api/admin/login', 'POST', { email:'teammate@test.local', password:'new-password-strong-12345' })).status, 401)
    assert.equal((await call('/api/admin/invitations/accept', 'POST', { token:invited.data.token, password:'too-short' })).status, 400)
    assert.equal((await call('/api/admin/invitations/accept', 'POST', { token:invited.data.token, password:'new-password-strong-12345' })).status, 200)
    assert.equal((await call('/api/admin/invitations/accept', 'POST', { token:invited.data.token, password:'new-password-strong-12345' })).status, 400)
    const teammateLogin = await call('/api/admin/login', 'POST', { email:'teammate@test.local', password:'new-password-strong-12345' })
    assert.equal(teammateLogin.status, 200)
    const teammateCookie = teammateLogin.cookie.split(';')[0]
    assert.equal((await call('/api/admin/users', 'GET', undefined, teammateCookie)).status, 403)
    assert.equal((await call('/api/admin/users/invite', 'POST', { email:'stranger@test.local', role:'admin' }, teammateCookie)).status, 403)
    assert.equal((await call('/api/admin/users/admin%40test.local/disable', 'POST', {}, adminCookie)).status, 403)
    assert.equal((await call('/api/admin/users/teammate%40test.local/role', 'POST', { role:'admin' }, adminCookie)).status, 200)
    assert.equal((await call('/api/admin/me', 'GET', undefined, teammateCookie)).status, 401)
    const promoted = await call('/api/admin/login', 'POST', { email:'teammate@test.local', password:'new-password-strong-12345' })
    assert.equal(promoted.data.role, 'admin')
    assert.equal((await call('/api/admin/users', 'GET', undefined, promoted.cookie.split(';')[0])).status, 403)
    assert.equal((await call('/api/admin/users/teammate%40test.local/sessions', 'POST', {}, adminCookie)).status, 200)
    assert.equal((await call('/api/admin/me', 'GET', undefined, promoted.cookie.split(';')[0])).status, 401)
    assert.equal((await call('/api/admin/users/teammate%40test.local/disable', 'POST', {}, adminCookie)).status, 200)
    assert.equal((await call('/api/admin/login', 'POST', { email:'teammate@test.local', password:'new-password-strong-12345' })).status, 401)
    const reinvited = await call('/api/admin/users/invite', 'POST', { email:'teammate@test.local', role:'reviewer' }, adminCookie)
    assert.equal(reinvited.status, 201)
    assert.equal((await call('/api/admin/invitations/accept', 'POST', { token:reinvited.data.token, password:'another-strong-password-12345' })).status, 200)
    const users = await call('/api/admin/users', 'GET', undefined, adminCookie)
    assert.equal(users.data.users.find(item => item.email === 'teammate@test.local').role, 'reviewer')
    assert.ok(users.data.activity.some(item => item.action === 'user_role_changed'))
    const expiredInvite = await call('/api/admin/users/invite', 'POST', { email:'expired@test.local', role:'sales' }, adminCookie)
    assert.equal(expiredInvite.status, 201)
    const summary = await call('/api/admin/summary', 'GET', undefined, adminCookie)
    assert.equal(summary.data.counts.start, 4)
    assert.equal(summary.data.counts.complete, 6)
    assert.equal(summary.data.counts.proposal, 1)
    assert.equal(summary.data.requests.length, 1)
    const exportResponse = await fetch(base + '/api/admin/export', { headers:{ cookie:adminCookie } })
    const csv = await exportResponse.text()
    assert.equal(exportResponse.status, 200)
    assert.ok(csv.includes('Manajer TI') && csv.includes('+62 812 3456 7890'))
    const detail = await call(`/api/admin/requests/${request.data.id}`, 'GET', undefined, adminCookie)
    assert.equal(detail.data.details.targets, 'contoh.test')
    assert.ok(detail.data.activity.some(item => item.action === 'details'))
    const salesLogin = await call('/api/admin/login', 'POST', { email:'sales@test.local', password:'sales-password-strong-12345' })
    assert.equal((await call('/api/admin/rules', 'GET', undefined, salesLogin.cookie.split(';')[0])).status, 403)
    const pricingLogin = await call('/api/admin/login', 'POST', { email:'pricing@test.local', password:'pricing-password-strong-12345' })
    const pricingCookie = pricingLogin.cookie.split(';')[0]
    assert.equal(pricingLogin.status, 200)
    assert.equal((await call('/api/admin/rules', 'GET', undefined, pricingCookie)).status, 200)
    assert.equal((await call('/api/admin/summary', 'GET', undefined, pricingCookie)).status, 403)
    assert.equal((await call(`/api/admin/requests/${request.data.id}`, 'GET', undefined, pricingCookie)).status, 403)
    assert.equal((await call('/api/admin/export', 'GET', undefined, pricingCookie)).status, 403)
    assert.equal((await call('/api/admin/rules/preview', 'POST', rules)).status, 401)
    const preview = await call('/api/admin/rules/preview', 'POST', rules, adminCookie)
    assert.equal(preview.status, 200)
    assert.equal(preview.data.samples.length, 12)
    assert.equal(preview.data.conditions.length, 20)
    assert.equal(preview.data.conditions.find(item => item.name === 'Dua peran pengguna').result.days, 4.5)
    assert.equal(preview.data.conditions.find(item => item.name === 'Akses melalui VPN').result.days, 4)
    assert.equal(preview.data.conditions.find(item => item.name === 'Perlu onsite').result.status, 'review')
    assert.equal(preview.data.conditions.find(item => item.name === 'Web dan API berbagi backend').result.low, null)
    assert.equal((await call('/api/admin/requests/' + request.data.id, 'PATCH', { status:'Proposal dikirim' }, adminCookie)).status, 400)
    const offerUrl = `/api/admin/requests/${request.data.id}/offer`
    const validUntil = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
    assert.equal((await call(offerUrl, 'POST', { price:25000000, summary:'Pentest aplikasi web dan laporan temuan lengkap.', validUntil })).status, 401)
    assert.equal((await call(`${offerUrl}/publish`, 'POST', {}, adminCookie)).status, 400)
    assert.equal((await call(offerUrl, 'POST', { price:25000000, summary:'Pentest aplikasi web dan laporan temuan lengkap.', validUntil }, salesLogin.cookie.split(';')[0])).status, 200)
    const savedOffer = await call(`/api/admin/requests/${request.data.id}`, 'GET', undefined, adminCookie)
    assert.equal(savedOffer.data.offer.price, 25000000)
    assert.equal(savedOffer.data.offer.publishedAt, null)
    assert.equal((await call(privateUrl)).data.offer, null)
    assert.equal((await call(`${offerUrl}/publish`, 'POST', { expected:{ price:1, summary:savedOffer.data.offer.summary, validUntil } }, salesLogin.cookie.split(';')[0])).status, 409)
    assert.equal((await call(privateUrl)).data.offer, null)
    assert.equal((await call(`${offerUrl}/publish`, 'POST', { expected:savedOffer.data.offer }, salesLogin.cookie.split(';')[0])).status, 200)
    const publishedOffer = await call(privateUrl)
    assert.equal(publishedOffer.data.offer.price, 25000000)
    assert.equal(publishedOffer.data.offer.summary, 'Pentest aplikasi web dan laporan temuan lengkap.')
    assert.equal(publishedOffer.data.offer.validUntil, validUntil)
    assert.equal(publishedOffer.data.status, 'Proposal dikirim')
    assert.equal((await call('/api/tickets/resolve', 'POST', { code:request.data.id })).data.id, request.data.id)
    assert.equal((await call(offerUrl, 'POST', { price:1, summary:'Perubahan tanpa persetujuan tidak dapat diterbitkan.', validUntil }, adminCookie)).status, 409)
    const reissued = await call(`/api/admin/requests/${request.data.id}/access-code`, 'POST', {}, adminCookie)
    assert.match(reissued.data.code, /^KMP-\d{4}-[A-F0-9]{32}$/)
    assert.equal((await call('/api/tickets/resolve', 'POST', { code:reissued.data.code })).data.id, request.data.id)
    assert.equal((await call('/api/tickets/resolve', 'POST', { code:request.data.id })).status, 404)
    assert.equal((await call(privateUrl)).status, 404)
    const renewedUrl = `/api/requests/${request.data.id}?token=${encodeURIComponent(reissued.data.code)}`
    assert.equal((await call(renewedUrl)).status, 200)

    const publish = await call('/api/admin/rules/publish', 'POST', { version:1 }, adminCookie)
    assert.equal(publish.status, 200)
    const priced = await call('/api/estimate', 'POST', { ...scope(), sessionId:'session-priced-1234567890' })
    assert.equal(priced.data.result.status, 'estimate')
    assert.equal(priced.data.result.rulesVersion, 1)
    const oldDetail = await call(`/api/admin/requests/${request.data.id}`, 'GET', undefined, adminCookie)
    assert.equal(oldDetail.data.result.rulesVersion, null)
    assert.equal(oldDetail.data.result.low, null)
    const revised = await call('/api/admin/rules', 'POST', { ...rules, rate:1500000 }, adminCookie)
    assert.equal(revised.data.version, 2)
    const stillPublished = await call('/api/estimate', 'POST', { ...scope(), sessionId:'session-draft-1234567890' })
    assert.equal(stillPublished.data.result.rulesVersion, 1)
    assert.equal((await call('/api/admin/rules/publish', 'POST', { version:2 }, adminCookie)).status, 200)
    const newPrice = await call('/api/estimate', 'POST', { ...scope(), sessionId:'session-version-1234567890' })
    assert.equal(newPrice.data.result.rulesVersion, 2)
    assert.ok(newPrice.data.result.low > priced.data.result.low)
    const raisedMinimum = await call('/api/admin/rules', 'POST', { ...rules, minimum:20000000 }, adminCookie)
    assert.equal((await call('/api/admin/rules/publish', 'POST', { version:raisedMinimum.data.version }, adminCookie)).status, 200)
    const floor = await call('/api/estimate', 'POST', { ...scope(), sessionId:'session-minimum-1234567890' })
    assert.equal(floor.data.result.low, 20000000)
    assert.equal(floor.data.result.high, 20000000)
    const db = new DatabaseSync(path.join(dataDir, 'kompas.sqlite'))
    const storedPassword = db.prepare('SELECT password_hash FROM users WHERE email=?').get('teammate@test.local').password_hash
    assert.ok(storedPassword.includes(':') && !storedPassword.includes('another-strong-password-12345'))
    db.prepare('UPDATE users SET invite_expires_at=? WHERE email=?').run('2000-01-01T00:00:00.000Z', 'expired@test.local')
    db.prepare('UPDATE requests SET token_expires_at=?,access_code_expires_at=? WHERE id=?').run('2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z', request.data.id)
    db.close()
    assert.equal((await call('/api/admin/invitations/accept', 'POST', { token:expiredInvite.data.token, password:'new-password-strong-12345' })).status, 400)
    assert.equal((await call(renewedUrl)).status, 404)

    const fromIp = (address, pathname, body) => fetch(base + pathname, { method:'POST', headers:{ 'content-type':'application/json', 'x-forwarded-for':address }, body:JSON.stringify(body) }).then(response => response.status)
    for (let i = 0; i < 10; i++) assert.equal(await fromIp('192.0.2.10', '/api/requests', {}), 400)
    assert.equal(await fromIp('192.0.2.10', '/api/requests', {}), 429)
    assert.equal(await fromIp('192.0.2.11', '/api/requests', {}), 400)
    for (let i = 0; i < 8; i++) assert.equal(await fromIp('192.0.2.12', '/api/admin/login', { email:'admin@test.local', password:'wrong' }), 401)
    assert.equal(await fromIp('192.0.2.12', '/api/admin/login', { email:'admin@test.local', password:'wrong' }), 429)
    assert.equal(await fromIp('192.0.2.13', '/api/admin/login', { email:'admin@test.local', password:'test-password-strong-12345' }), 200)
    const loginAgain = await fetch(base + '/api/admin/login', { method:'POST', headers:{ 'content-type':'application/json', 'x-forwarded-for':'192.0.2.14' }, body:JSON.stringify({ email:'teammate@test.local', password:'another-strong-password-12345' }) })
    assert.equal(loginAgain.status, 200)
    const teammateSession = loginAgain.headers.get('set-cookie').split(';')[0]
    assert.equal((await call('/api/admin/password', 'POST', { currentPassword:'wrong-password-12345', newPassword:'replacement-password-12345' }, teammateSession)).status, 400)
    assert.equal((await call('/api/admin/password', 'POST', { currentPassword:'another-strong-password-12345', newPassword:'replacement-password-12345' }, teammateSession)).status, 200)
    assert.equal((await call('/api/admin/me', 'GET', undefined, teammateSession)).status, 401)
    assert.equal(await fromIp('192.0.2.14', '/api/admin/login', { email:'teammate@test.local', password:'another-strong-password-12345' }), 401)
    assert.equal(await fromIp('192.0.2.14', '/api/admin/login', { email:'teammate@test.local', password:'replacement-password-12345' }), 200)
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM')
      await new Promise(resolve => child.once('exit', resolve))
    }
    rmSync(dataDir, { recursive:true, force:true })
  }
})

test('akun database tetap berlaku setelah restart dan perubahan env', { timeout: 20000 }, async () => {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'kompas-users-'))
  const port = await freePort()
  const base = `http://127.0.0.1:${port}`
  let child
  const start = async environmentPassword => {
    child = spawn(process.execPath, ['server.js'], { cwd:process.cwd(), env:{ ...process.env, PORT:String(port), DATA_DIR:dataDir, ADMIN_EMAIL:'owner@test.local', ADMIN_PASSWORD:environmentPassword }, stdio:'ignore' })
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await fetch(base + '/api/health')).ok) return } catch {}
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    throw new Error('Server tidak siap setelah restart')
  }
  const stop = async () => { if (child && child.exitCode === null && child.signalCode === null) { child.kill('SIGTERM'); await new Promise(resolve => child.once('exit', resolve)) } }
  const login = (password) => fetch(base + '/api/admin/login', { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ email:'owner@test.local', password }) })
  try {
    await start('initial-password-12345')
    const first = await login('initial-password-12345')
    assert.equal(first.status, 200)
    const changed = await fetch(base + '/api/admin/password', { method:'POST', headers:{ 'content-type':'application/json', cookie:first.headers.get('set-cookie').split(';')[0] }, body:JSON.stringify({ currentPassword:'initial-password-12345', newPassword:'replacement-password-12345' }) })
    assert.equal(changed.status, 200)
    await stop()
    await start('different-env-password-12345')
    assert.equal((await login('initial-password-12345')).status, 401)
    assert.equal((await login('different-env-password-12345')).status, 401)
    assert.equal((await login('replacement-password-12345')).status, 200)
  } finally {
    await stop()
    rmSync(dataDir, { recursive:true, force:true })
  }
})

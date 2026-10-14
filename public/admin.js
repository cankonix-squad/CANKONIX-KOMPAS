const root = document.querySelector('#admin')
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const money = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
const focusView = () => { const heading = root.querySelector('h2'); if (heading) { heading.tabIndex = -1; heading.focus() } }
const objectNames = { web: 'Web Application', api: 'API', mobile: 'Mobile Application', infra: 'Infrastruktur' }
const sizeNames = { web: 'fitur utama', api: 'endpoint', mobile: 'fitur utama', infra: 'host/IP' }
const readable = value => value === 'unknown' || value === undefined || value === null || value === '' ? 'Belum tahu' : String(value)
const infoRow = (label, value) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`
function renderScope(scope) {
  const methods = { black: 'Black Box', gray: 'Gray Box', white: 'White Box', unsure: 'Bantu tentukan' }
  const environments = { staging: 'Staging / pengujian', production: 'Production', other: 'Lainnya' }
  const access = { internet: 'Melalui internet', vpn: 'Melalui VPN', onsite: 'Onsite', unsure: 'Belum tahu' }
  const windows = { business: 'Jam kerja', after: 'Di luar jam kerja', discuss: 'Dijadwalkan bersama' }
  const shared = { yes: 'Ya, ada target atau backend yang sama', no: 'Tidak, semuanya terpisah', unknown: 'Belum tahu' }
  return `<ul class="scope-items">${scope.objects.map(object => `<li><strong>${escape(objectNames[object.type] || object.type)}</strong><span>${escape(readable(object.count))} objek · ${escape(readable(object.size))} ${escape(sizeNames[object.type] || 'unit cakupan')}${object.type === 'mobile' ? ` · Platform: ${escape({ android: 'Android', ios: 'iOS', both: 'Android dan iOS', unknown: 'Belum tahu' }[object.platform] || 'Belum tahu')}` : ''}</span></li>`).join('')}</ul><dl class="info-grid">
    ${infoRow('Metode pengujian', methods[scope.method] || readable(scope.method))}
    ${infoRow('Lingkungan', environments[scope.environment] || readable(scope.environment))}
    ${infoRow('Cara akses', access[scope.access] || readable(scope.access))}
    ${infoRow('Waktu pengujian', windows[scope.window] || readable(scope.window))}
    ${infoRow('Jenis akun/peran pengguna', readable(scope.roles))}
    ${scope.objects.length > 1 ? infoRow('Target atau backend bersama', shared[scope.sharedTarget] || 'Belum tahu') : ''}
    ${scope.notes ? infoRow('Kebutuhan khusus', scope.notes) : ''}
  </dl>`
}
function renderClientDetails(details) {
  const labels = { targets: 'URL, IP, atau nama target', inScope: 'Fitur atau endpoint yang diuji', outOfScope: 'Bagian yang tidak diuji', documentation: 'Tautan dokumentasi', deadline: 'Target waktu atau batasan jadwal' }
  return `<dl class="info-grid">${Object.entries(labels).map(([key, label]) => infoRow(label, details?.[key] || 'Belum diisi')).join('')}</dl>`
}

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { 'content-type': 'application/json' }, ...options })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Permintaan gagal.')
  return data
}
const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) })

let summary = null
let ruleData = null
let userData = null
let user = null
let range = { from: '', to: '' }
const roles = { admin: 'Admin', sales: 'Sales', reviewer: 'Reviewer teknis', pricing: 'Pengelola harga' }

function acceptInvitation(token) {
  history.replaceState(null, '', '/admin')
  root.innerHTML = `<section class="card" style="max-width:520px"><h2>Aktifkan akun KOMPAS</h2><p>Buat password untuk akun yang diundang. Tautan ini hanya dapat digunakan sekali.</p><label class="field">Password baru<input id="invite-password" type="password" minlength="16" maxlength="128" autocomplete="new-password"></label><label class="field">Ulangi password<input id="invite-confirm" type="password" minlength="16" maxlength="128" autocomplete="new-password"></label><button class="button" id="activate-account">Aktifkan akun</button><p class="error" id="invite-error" role="alert"></p></section>`
  document.querySelector('#activate-account').onclick = async () => {
    const password = document.querySelector('#invite-password').value
    const confirmation = document.querySelector('#invite-confirm').value
    try {
      if (password !== confirmation) throw new Error('Password yang diulang belum sama.')
      await post('/api/admin/invitations/accept', { token, password })
      login('Akun aktif. Silakan masuk dengan email dan password baru.')
    } catch (err) { document.querySelector('#invite-error').textContent = err.message }
  }
}

function login(message = '') {
  root.innerHTML = `<section class="card" style="max-width:420px">
    <h2>Masuk admin</h2>
    <label class="field">Email<input id="login-email" type="email" autocomplete="username"></label>
    <label class="field">Password<input id="login-password" type="password" autocomplete="current-password"></label>
    <p class="error" id="login-error" role="alert">${escape(message)}</p>
    <button class="button" id="login-button">Masuk</button>
  </section>`
  document.querySelector('#login-button').onclick = async () => {
    try {
      await post('/api/admin/login', {
        email: document.querySelector('#login-email').value,
        password: document.querySelector('#login-password').value
      })
      await load()
    } catch (err) { document.querySelector('#login-error').textContent = err.message }
  }
}

async function load() {
  try {
    const query = new URLSearchParams()
    if (range.from) query.set('from', range.from)
    if (range.to) query.set('to', range.to)
    user = await api('/api/admin/me')
    const [nextSummary, nextRules, nextUsers] = await Promise.all([
      user.role === 'pricing' ? Promise.resolve(null) : api(`/api/admin/summary?${query}`),
      ['admin', 'pricing'].includes(user.role) ? api('/api/admin/rules') : Promise.resolve(null),
      user.owner ? api('/api/admin/users') : Promise.resolve(null)
    ])
    summary = nextSummary || { counts: {}, requests: [] }
    ruleData = nextRules
    userData = nextUsers
    dashboard()
  } catch (err) {
    if (err.message.includes('masuk')) login()
    else root.innerHTML = `<p class="error">${escape(err.message)}</p>`
  }
}

function dashboard() {
  const counts = summary.counts || {}
  const canViewRequests = user.role !== 'pricing'
  root.innerHTML = `<div class="admin-layout"><nav class="admin-sidebar" aria-label="Menu admin">
    <strong>KOMPAS Admin</strong>
    ${canViewRequests ? '<a href="#admin-overview">Ringkasan</a><a href="#admin-requests">Permintaan</a>' : ''}
    ${userData ? '<a href="#admin-users">Pengguna internal</a>' : ''}
    ${ruleData ? '<a href="#admin-pricing">Aturan harga</a>' : ''}
    <a href="#admin-password">Ubah password</a>
    <button class="button secondary" id="logout">Keluar</button>
  </nav><div class="admin-content">${canViewRequests ? `<div class="stats" id="admin-overview">
    <div class="card stat">Mulai mengisi<b>${counts.start || 0}</b></div>
    <div class="card stat">Estimasi selesai<b>${counts.complete || 0}</b></div>
    <div class="card stat">Minta proposal<b>${counts.proposal || 0}</b></div>
  </div>
  <section class="card" id="admin-requests">
    <h2>Daftar permintaan</h2>
    <p class="muted">Masuk sebagai ${escape(user.email)} (${escape(user.role)}). Metrik menunjukkan peristiwa formulir, bukan pengunjung unik. Rentang tanggal dihitung dalam UTC.</p>
    <div class="fields">
      <label class="field">Dari tanggal<input type="date" id="from" value="${escape(range.from)}"></label>
      <label class="field">Sampai tanggal<input type="date" id="to" value="${escape(range.to)}"></label>
    </div>
    <div class="actions"><button class="button secondary" id="apply-range">Terapkan rentang</button>${['admin', 'sales'].includes(user.role) ? '<a class="button secondary" href="/api/admin/export">Unduh CSV</a>' : ''}</div>
    <div class="fields" style="margin-top:16px">
      <label class="field">Cari permintaan<input id="search" placeholder="Nama, perusahaan, atau nomor referensi"></label>
      <label class="field">Filter status<select id="status-filter"><option value="">Semua status</option>${['Baru', 'Perlu ditinjau', 'Dihubungi', 'Proposal dikirim', 'Menang', 'Tidak lanjut'].map(status => `<option>${status}</option>`).join('')}</select></label>
    </div>
    <div class="table-wrap"><table><thead><tr><th scope="col">Referensi</th><th scope="col">Klien</th><th scope="col">Objek</th><th scope="col">Hasil</th><th scope="col">Status</th><th scope="col">Tanggal</th></tr></thead><tbody id="rows"></tbody></table></div>
  </section>` : ''}
  ${userData ? '<section class="card" id="admin-users"><h2>Pengguna internal</h2><div id="users-panel"></div></section>' : ''}
  ${ruleData ? `<section class="card" id="admin-pricing"><h2>Aturan harga internal</h2><div id="rules-form"></div></section>` : ''}
  <section class="card" id="admin-password"><h2>Ubah password saya</h2><p class="muted">Setelah diganti, semua sesi akun ini akan keluar. Masuk kembali dengan password baru.</p><div class="fields"><label class="field">Password saat ini<input id="current-password" type="password" autocomplete="current-password"></label><label class="field">Password baru<input id="new-password" type="password" minlength="16" maxlength="128" autocomplete="new-password"></label><label class="field">Ulangi password baru<input id="confirm-password" type="password" minlength="16" maxlength="128" autocomplete="new-password"></label></div><button class="button secondary" id="change-password">Simpan password baru</button><p class="error" id="password-error" role="alert"></p></section></div></div>`

  document.querySelector('#logout').onclick = async () => { await post('/api/admin/logout', {}); login() }
  if (canViewRequests) {
    document.querySelector('#apply-range').onclick = () => {
      range = { from: document.querySelector('#from').value, to: document.querySelector('#to').value }
      load()
    }
    document.querySelector('#search').oninput = renderRows
    document.querySelector('#status-filter').onchange = renderRows
    renderRows()
  }
  if (userData) renderUsers()
  document.querySelector('#change-password').onclick = async () => {
    try {
      const newPassword = document.querySelector('#new-password').value
      if (newPassword !== document.querySelector('#confirm-password').value) throw new Error('Password yang diulang belum sama.')
      await post('/api/admin/password', { currentPassword: document.querySelector('#current-password').value, newPassword })
      login('Password berhasil diganti. Silakan masuk kembali.')
    } catch (err) { document.querySelector('#password-error').textContent = err.message }
  }
  if (ruleData) renderRules()
  focusView()
}

function renderUsers() {
  const options = Object.entries(roles).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')
  document.querySelector('#users-panel').innerHTML = `<p class="muted">Hanya pemilik sistem yang dapat mengelola akun. Undangan berlaku 24 jam dan tautannya ditampilkan sekali.</p>
    <div class="fields"><label class="field">Email pengguna baru<input id="new-user-email" type="email" autocomplete="off" placeholder="nama@cankonix.com"></label><label class="field">Peran<select id="new-user-role">${options}</select></label></div>
    <button class="button" id="invite-user">Buat undangan</button><p id="invite-result" role="status"></p><p id="users-error" class="error" role="alert"></p>
    <div class="table-wrap"><table><thead><tr><th scope="col">Email</th><th scope="col">Peran</th><th scope="col">Status</th><th scope="col">Tindakan</th></tr></thead><tbody>${userData.users.map(item => `<tr><th scope="row">${escape(item.email)}${item.owner ? ' · Pemilik' : ''}</th><td>${item.owner ? escape(roles[item.role]) : `<select class="admin-filter" data-role="${escape(item.email)}" aria-label="Peran ${escape(item.email)}">${Object.entries(roles).map(([value, label]) => `<option value="${value}" ${value === item.role ? 'selected' : ''}>${label}</option>`).join('')}</select>`}</td><td>${item.status === 'active' ? 'Aktif' : item.status === 'pending' ? `Menunggu aktivasi sampai ${escape(item.inviteExpiresAt?.slice(0, 10) || '-')}` : 'Nonaktif'}</td><td>${item.owner ? 'Akun pemilik' : item.status === 'active' ? `<div class="user-actions"><button class="button secondary" data-action="role" data-email="${escape(item.email)}">Simpan peran</button><button class="button secondary" data-action="sessions" data-email="${escape(item.email)}">Cabut sesi</button><button class="button secondary" data-action="disable" data-email="${escape(item.email)}">Nonaktifkan</button></div>` : `<button class="button secondary" data-action="reinvite" data-email="${escape(item.email)}">Buat undangan baru</button>`}</td></tr>`).join('')}</tbody></table></div>
    <details><summary>Riwayat perubahan pengguna</summary><ul class="summary-list">${userData.activity.length ? userData.activity.map(entry => `<li>${new Date(entry.createdAt).toLocaleString('id-ID')} · ${escape(entry.detail)}</li>`).join('') : '<li>Belum ada perubahan.</li>'}</ul></details>`
  const invite = async (email, role) => {
    const value = await post('/api/admin/users/invite', { email, role })
    await load()
    const link = `${location.origin}/admin#invite=${encodeURIComponent(value.token)}`
    const result = document.querySelector('#invite-result')
    result.innerHTML = `<span>Salin tautan ini sekarang dan bagikan secara privat. Berlaku sampai ${escape(value.expiresAt)}.</span><input id="invite-link" class="admin-filter" readonly value="${escape(link)}"><button class="button secondary" id="copy-invite">Salin tautan</button>`
    document.querySelector('#copy-invite').onclick = async () => { try { await navigator.clipboard.writeText(link); document.querySelector('#copy-invite').textContent = 'Tautan tersalin' } catch { document.querySelector('#invite-link').select() } }
  }
  document.querySelector('#invite-user').onclick = async () => {
    try { await invite(document.querySelector('#new-user-email').value, document.querySelector('#new-user-role').value) }
    catch (err) { document.querySelector('#users-error').textContent = err.message }
  }
  document.querySelectorAll('[data-action]').forEach(button => { button.onclick = async () => {
    try {
      const email = button.dataset.email
      const action = button.dataset.action
      if (action === 'reinvite') { const item = userData.users.find(entry => entry.email === email); await invite(email, item.role); return }
      if (action === 'disable' && !confirm(`Nonaktifkan ${email}? Akun dan semua sesinya akan dicabut.`)) return
      if (action === 'role') await post(`/api/admin/users/${encodeURIComponent(email)}/role`, { role: document.querySelector(`[data-role="${CSS.escape(email)}"]`).value })
      else await post(`/api/admin/users/${encodeURIComponent(email)}/${action}`, {})
      await load()
    } catch (err) { document.querySelector('#users-error').textContent = err.message }
  } })
}

function renderRows() {
  const query = (document.querySelector('#search')?.value || '').toLowerCase()
  const status = document.querySelector('#status-filter')?.value || ''
  const rows = summary.requests.filter(item => `${item.id} ${item.contact.name} ${item.contact.company}`.toLowerCase().includes(query) && (!status || item.status === status))
  document.querySelector('#rows').innerHTML = rows.length ? rows.map(item => `<tr>
    <th scope="row"><button type="button" class="table-link" data-id="${escape(item.id)}" aria-label="Buka permintaan ${escape(item.id)} dari ${escape(item.contact.company)}">${escape(item.id)}</button></th><td><strong>${escape(item.contact.company)}</strong><br>${escape(item.contact.name)}</td>
    <td>${item.scope.objects.map(object => escape(object.type)).join(', ')}</td>
    <td>${item.result.status === 'estimate' ? `${money(item.result.low)} – ${money(item.result.high)}` : 'Perlu ditinjau'}</td>
    <td><span class="tag">${escape(item.status)}</span></td><td>${new Date(item.createdAt).toLocaleDateString('id-ID')}</td>
  </tr>`).join('') : '<tr><td colspan="6">Belum ada permintaan.</td></tr>'
  document.querySelectorAll('button[data-id]').forEach(button => { button.onclick = () => detail(button.dataset.id) })
}

async function detail(id) {
  try {
    const item = await api(`/api/admin/requests/${id}`)
    root.innerHTML = `<section class="card">
      <button class="button secondary" id="back">← Kembali</button>
      <h2 style="margin-top:20px">${item.id} · ${escape(item.contact.company)}</h2>
      <p>${escape(item.contact.name)}${item.contact.position ? ` · ${escape(item.contact.position)}` : ''} · <a href="mailto:${escape(item.contact.email)}">${escape(item.contact.email)}</a>${item.contact.phone ? ` · ${escape(item.contact.phone)}` : ''}</p>
      <p>Hasil: <strong>${item.result.status === 'estimate' ? `${money(item.result.low)} – ${money(item.result.high)}` : 'Perlu ditinjau'}</strong> ${item.result.days !== null ? `· ${item.result.days} hari kerja` : ''}</p>
      <p>Versi aturan: ${item.result.rulesVersion ?? 'belum aktif'}</p>
      ${['admin','sales'].includes(user.role) ? `<div class="notice"><p>Klien dapat membuka permintaan dengan kode akses baru. Pembuatan ulang akan menonaktifkan kode dan tautan privat sebelumnya.</p><button class="button secondary" id="issue-code">Buat kode akses baru</button><p id="code-result" role="status"></p></div>` : ''}
      <h2>Cakupan awal</h2>${renderScope(item.scope)}
      <h2>Detail dari klien</h2>${renderClientDetails(item.details)}
      ${user.role !== 'pricing' ? `<h2>Kelola permintaan</h2>
      <div class="fields"><label class="field">Status<select id="status">${['Baru', 'Perlu ditinjau', 'Dihubungi', 'Proposal dikirim', 'Menang', 'Tidak lanjut'].map(status => `<option ${status === item.status ? 'selected' : ''}>${status}</option>`).join('')}</select></label>
      <label class="field">Penanggung jawab<input id="owner" maxlength="120" value="${escape(item.owner)}"></label></div>
      <label class="field">Catatan internal<textarea id="notes" maxlength="4000">${escape(item.notes)}</textarea></label>
      <button class="button" id="save">Simpan perubahan</button><p class="error" id="error" role="alert"></p>` : ''}
      ${['admin','sales'].includes(user.role) ? `<h2>Penawaran untuk klien</h2>
      ${item.offer.publishedAt ? `<p class="notice">Penawaran diterbitkan pada ${escape(item.offer.publishedAt)} dan dapat dilihat lewat nomor tiket klien.</p>` : '<p class="notice warn">Draf hanya terlihat oleh tim internal. Simpan perubahan, lalu terbitkan di halaman tiket klien. Sistem tidak mengirim email otomatis.</p>'}
      ${item.offer.price && item.offer.summary && item.offer.validUntil ? `<div class="offer-preview"><strong>${item.offer.publishedAt ? 'Penawaran terbit' : 'Draf tersimpan'}</strong><p>Harga: ${money(item.offer.price)}<br>Berlaku sampai: ${escape(item.offer.validUntil)}</p><p>${escape(item.offer.summary)}</p></div>` : ''}
      <label class="field">Harga penawaran final (Rp)<input id="offer-price" type="number" min="1" max="1000000000000" value="${escape(item.offer.price ?? '')}" ${item.offer.publishedAt?'disabled':''}></label>
      <label class="field">Ringkasan cakupan dan deliverable<textarea id="offer-summary" maxlength="4000" ${item.offer.publishedAt?'disabled':''}>${escape(item.offer.summary)}</textarea></label>
      <label class="field">Berlaku sampai<input id="offer-valid" type="date" value="${escape(item.offer.validUntil)}" ${item.offer.publishedAt?'disabled':''}></label>
      ${item.offer.publishedAt?'': '<div class="actions"><button class="button secondary" id="offer-save">Simpan draf penawaran</button><button class="button" id="offer-publish">Terbitkan di halaman tiket</button></div>'}
      <p class="error" id="offer-error" role="alert"></p>` : ''}
      <h2>Riwayat</h2><ul class="summary-list">${item.activity.map(entry => `<li>${new Date(entry.created_at).toLocaleString('id-ID')} · ${escape(entry.detail)}</li>`).join('')}</ul>
    </section>`
    document.querySelector('#back').onclick = load
    focusView()
    if (['admin','sales'].includes(user.role)) document.querySelector('#issue-code').onclick = async () => {
      try {
        if (!confirm('Buat kode akses baru untuk klien? Kode akses sebelumnya tidak dapat dipakai lagi.')) return
        const value = await post(`/api/admin/requests/${id}/access-code`, {})
        document.querySelector('#code-result').innerHTML = `Kode baru (salin sekarang): <strong>${escape(value.code)}</strong><br>Berlaku sampai ${escape(value.expiresAt.slice(0,10))}. Bagikan secara privat kepada klien.`
      } catch (err) { document.querySelector('#code-result').textContent = err.message }
    }
    if (user.role !== 'pricing') document.querySelector('#save').onclick = async () => {
      try {
        await api(`/api/admin/requests/${id}`, { method: 'PATCH', body: JSON.stringify({
          status: document.querySelector('#status').value,
          owner: document.querySelector('#owner').value,
          notes: document.querySelector('#notes').value
        }) })
        await detail(id)
      } catch (err) { document.querySelector('#error').textContent = err.message }
    }
    if (['admin','sales'].includes(user.role) && !item.offer.publishedAt) {
      document.querySelector('#offer-save').onclick = async () => {
        try {
          await post(`/api/admin/requests/${id}/offer`, { price:document.querySelector('#offer-price').value, summary:document.querySelector('#offer-summary').value, validUntil:document.querySelector('#offer-valid').value })
          await detail(id)
        } catch (err) { document.querySelector('#offer-error').textContent = err.message }
      }
      document.querySelector('#offer-publish').onclick = async () => {
        try {
          const saved = item.offer
          const currentPrice = Number(document.querySelector('#offer-price').value)
          const currentSummary = document.querySelector('#offer-summary').value.trim()
          const currentValidUntil = document.querySelector('#offer-valid').value
          if (!saved.price || currentPrice !== saved.price || currentSummary !== saved.summary || currentValidUntil !== saved.validUntil) throw new Error('Simpan perubahan sebagai draf penawaran sebelum menerbitkan.')
          if (!confirm(`Terbitkan penawaran ${money(saved.price)} yang berlaku sampai ${saved.validUntil} di halaman tiket klien? Sistem tidak mengirim email otomatis.`)) return
          await post(`/api/admin/requests/${id}/offer/publish`, { expected: { price: saved.price, summary: saved.summary, validUntil: saved.validUntil } })
          await detail(id)
        } catch (err) { document.querySelector('#offer-error').textContent = err.message }
      }
    }
  } catch (err) {
    root.innerHTML = `<p class="error">${escape(err.message)}</p><button class="button secondary" id="back">Kembali</button>`
    document.querySelector('#back').onclick = load
  }
}

function renderRules() {
  const published = ruleData.published
  const draft = ruleData.draft
  const rules = draft?.rules || published?.rules || { days: { web: '', api: '', mobile: '', infra: '' }, methodDays: { black: 0, gray: 0, white: 0 }, rate: '', minimum: '', uncertainty: 0.15, extraRoleDays: 0, productionDays: 0, afterHoursDays: 0, onsiteDays: 0, sizeUnit: 10, sizeDays: 0 }
  const fields = [
    ['rate', 'Tarif per hari kerja (Rp)'], ['minimum', 'Harga minimum pentest (Rp)'],
    ['uncertainty', 'Rentang ketidakpastian (0–0,5)'], ['extraRoleDays', 'Tambahan hari per peran'],
    ['productionDays', 'Tambahan hari di production'], ['afterHoursDays', 'Tambahan hari di luar jam kerja'],
    ['onsiteDays', 'Tambahan hari onsite'], ['sizeUnit', 'Unit ukuran cakupan'],
    ['sizeDays', 'Tambahan hari per unit ukuran']
  ]
  document.querySelector('#rules-form').innerHTML = `
    <p class="notice warn">${published?.version ? `Versi ${published.version} aktif untuk klien.` : 'Belum ada harga yang diterbitkan. Klien akan melihat “Perlu ditinjau”.'} ${draft ? `Draf versi ${draft.version} siap diedit.` : 'Simpan draf baru sebelum menerbitkan.'}</p>
    <p class="muted">Periksa biaya operasional Cankonix sebelum menerbitkan. Acuan harga paket pasar: <a href="https://widyasecurity.com/2026/07/13/penetration-testing-indonesia/" target="_blank" rel="noopener noreferrer">Widya Security</a> dan <a href="https://www.logique.co.id/en/services/security/penetration-test/pen-test.php" target="_blank" rel="noopener noreferrer">LOGIQUE</a>.</p>
    <div class="fields">
      ${['web', 'api', 'mobile', 'infra'].map(type => `<label class="field">Hari dasar ${type}<input type="number" min="0.1" step="0.1" data-day="${type}" value="${escape(rules.days[type])}"></label>`).join('')}
      ${['black', 'gray', 'white'].map(method => `<label class="field">Tambahan hari ${method.toUpperCase()} Box<input type="number" min="0" step="0.1" data-method="${method}" value="${escape(rules.methodDays?.[method] ?? 0)}"></label>`).join('')}
      ${fields.map(([key, label]) => `<label class="field">${label}<input type="number" min="0" step="any" data-rule="${key}" value="${escape(rules[key])}"></label>`).join('')}
    </div>
    <div class="actions"><button id="preview-rules" class="button secondary">Lihat contoh harga</button><button id="save-rules" class="button secondary">Simpan draf</button>${draft ? '<button id="publish-rules" class="button">Terbitkan draf untuk klien</button>' : ''}</div>
    <div id="rules-preview" aria-live="polite"></div>
    <p class="error" id="rules-error" role="alert"></p>`
  const readForm = () => ({
    days: Object.fromEntries([...document.querySelectorAll('[data-day]')].map(input => [input.dataset.day, Number(input.value)])),
    methodDays: Object.fromEntries([...document.querySelectorAll('[data-method]')].map(input => [input.dataset.method, Number(input.value)])),
    ...Object.fromEntries([...document.querySelectorAll('[data-rule]')].map(input => [input.dataset.rule, Number(input.value)]))
  })
  const renderPreview = async () => {
    try {
      const { samples, conditions } = await post('/api/admin/rules/preview', readForm())
      document.querySelector('#rules-error').textContent = ''
      const rows = items => items.map(item => `<tr><th scope="row">${escape(item.name)}</th><td>${item.result.days ?? '—'}</td><td>${item.result.status === 'estimate' ? `${money(item.result.low)} – ${money(item.result.high)}` : 'Tinjau manual'}</td></tr>`).join('')
      const table = (title, items) => `<h3>${title}</h3><div class="table-wrap"><table><thead><tr><th scope="col">Kondisi</th><th scope="col">Hari kerja</th><th scope="col">Kisaran indikatif</th></tr></thead><tbody>${rows(items)}</tbody></table></div>`
      document.querySelector('#rules-preview').innerHTML = `<p class="notice">Pratinjau internal dari angka pada formulir. Mengubah draf atau melihat contoh tidak menerbitkan harga ke klien.</p>${table('Harga dasar tiap objek dan metode', samples)}<p class="muted">Asumsi: satu objek, satu peran, ukuran 10, staging, akses internet, jam kerja. Mobile memakai satu platform Android.</p>${table('Dampak kondisi dan pengecualian', conditions)}<p class="muted">“Tinjau manual” berarti harga ditahan sampai cakupan jelas, termasuk onsite, dua platform mobile, dan objek yang berbagi backend. VPN tidak menambah hari dalam aturan saat ini.</p>`
    } catch (err) { document.querySelector('#rules-error').textContent = err.message }
  }
  document.querySelector('#preview-rules').onclick = renderPreview
  document.querySelector('#save-rules').onclick = async () => {
    try {
      await post('/api/admin/rules', readForm())
      await load()
    } catch (err) { document.querySelector('#rules-error').textContent = err.message }
  }
  if (draft) document.querySelector('#publish-rules').onclick = async () => {
    try {
      if (JSON.stringify(readForm()) !== JSON.stringify(draft.rules)) throw new Error('Simpan perubahan sebagai draf sebelum menerbitkan.')
      if (!confirm(`Terbitkan draf versi ${draft.version}? Harga baru akan tampil kepada klien setelah ini.`)) return
      await post('/api/admin/rules/publish', { version: draft.version })
      await load()
    } catch (err) { document.querySelector('#rules-error').textContent = err.message }
  }
  if (draft || published?.version) renderPreview()
}

const invitation = new URLSearchParams(location.hash.slice(1)).get('invite')
if (invitation) acceptInvitation(invitation)
else load()

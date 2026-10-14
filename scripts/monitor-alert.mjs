const repository = process.env.GITHUB_REPOSITORY || ''
const token = process.env.GITHUB_TOKEN || ''
const kind = process.env.MONITOR_KIND || ''
const status = process.env.MONITOR_STATUS || ''
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !token) throw new Error('Akses GitHub monitor belum lengkap.')
if (!['health', 'pipeline', 'test'].includes(kind) || !['failure', 'ok'].includes(status)) throw new Error('Jenis peringatan tidak valid.')

const titles = {
  health: 'KOMPAS: layanan tidak sehat',
  pipeline: 'KOMPAS: pipeline atau deploy gagal',
  test: 'KOMPAS: uji peringatan otomatis'
}
const title = titles[kind]
const runUrl = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`
const api = async (method, endpoint, body) => {
  const response = await fetch(`https://api.github.com/repos/${repository}${endpoint}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'kompas-monitor'
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  if (!response.ok) throw new Error(`GitHub API gagal: ${method} ${endpoint} (${response.status}).`)
  return response.status === 204 ? null : response.json()
}

let existing = null
for (let page = 1; page <= 20 && !existing; page++) {
  const issues = await api('GET', `/issues?state=open&per_page=100&page=${page}`)
  existing = issues.find(issue => !issue.pull_request && issue.title === title)
  if (issues.length < 100) break
}

if (status === 'failure') {
  if (existing) {
    console.log(`Peringatan sudah terbuka: #${existing.number}`)
  } else {
    const description = kind === 'test'
      ? 'Ini uji jalur peringatan otomatis. Tidak ada gangguan layanan.'
      : kind === 'health'
        ? 'Pemeriksaan HTTPS /api/health gagal. Periksa layanan KOMPAS dan Traefik.'
        : 'Workflow CI/CD KOMPAS pada branch main gagal. Periksa tahap tes, build, atau deploy.'
    const issue = await api('POST', '/issues', {
      title,
      body: `${description}\n\nRun pemeriksaan: ${runUrl}\nWaktu UTC: ${new Date().toISOString()}\n\nIssue ini akan ditutup otomatis setelah pemeriksaan berikutnya berhasil.`
    })
    console.log(`Peringatan dibuat: #${issue.number}`)
  }
} else if (existing) {
  await api('POST', `/issues/${existing.number}/comments`, { body: `Pemeriksaan kembali berhasil pada ${new Date().toISOString()}. Run: ${runUrl}` })
  await api('PATCH', `/issues/${existing.number}`, { state: 'closed' })
  console.log(`Peringatan ditutup: #${existing.number}`)
} else {
  console.log('Tidak ada peringatan terbuka.')
}

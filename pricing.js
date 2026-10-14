export const OBJECTS = ['web', 'api', 'mobile', 'infra']
export const METHODS = ['black', 'gray', 'white', 'unsure']
export const ENVIRONMENTS = ['staging', 'production', 'other']
export const ACCESS = ['internet', 'vpn', 'onsite', 'unsure']
export const WINDOWS = ['business', 'after', 'discuss']

export function validateScope(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.objects) || !value.objects.length || value.objects.length > 4) throw new Error('Pilih setidaknya satu jenis objek.')
  const seen = new Set()
  const objects = value.objects.map(item => {
    if (!item || !OBJECTS.includes(item.type) || seen.has(item.type)) throw new Error('Jenis objek tidak valid atau berulang.')
    seen.add(item.type)
    const count = Number(item.count)
    if (!Number.isInteger(count) || count < 1 || count > 10000) throw new Error('Jumlah objek harus antara 1 dan 10.000.')
    const size = item.size === 'unknown' ? 'unknown' : Number(item.size)
    if (size !== 'unknown' && (!Number.isInteger(size) || size < 1 || size > 100000)) throw new Error('Ukuran cakupan tidak valid.')
    return { type: item.type, count, size }
  })
  if (!METHODS.includes(value.method)) throw new Error('Pilih metode pengujian.')
  if (!ENVIRONMENTS.includes(value.environment)) throw new Error('Pilih lingkungan pengujian.')
  if (!ACCESS.includes(value.access)) throw new Error('Pilih cara akses target.')
  if (!WINDOWS.includes(value.window)) throw new Error('Pilih waktu pengujian.')
  const roles = value.roles === 'unknown' ? 'unknown' : Number(value.roles)
  if (roles !== 'unknown' && (!Number.isInteger(roles) || roles < 0 || roles > 1000)) throw new Error('Jumlah peran pengguna tidak valid.')
  const notes = String(value.notes || '').trim().slice(0, 2000)
  const sharedTarget = objects.length > 1 ? (value.sharedTarget || 'unknown') : 'no'
  if (!['yes', 'no', 'unknown'].includes(sharedTarget)) throw new Error('Hubungan antar target tidak valid.')
  return { objects, method: value.method, environment: value.environment, access: value.access, window: value.window, roles, sharedTarget, notes }
}

export function validateRules(value) {
  if (!value || typeof value !== 'object') throw new Error('Aturan harga tidak valid.')
  const number = (key, min = 0, max = 1000000000) => {
    const n = Number(value[key])
    if (!Number.isFinite(n) || n < min || n > max) throw new Error(`Nilai ${key} tidak valid.`)
    return n
  }
  const days = {}
  for (const type of OBJECTS) {
    const n = Number(value.days?.[type])
    if (!Number.isFinite(n) || n <= 0 || n > 365) throw new Error(`Hari dasar ${type} tidak valid.`)
    days[type] = n
  }
  const methodDays = {}
  for (const method of ['black', 'gray', 'white']) {
    const n = Number(value.methodDays?.[method])
    if (!Number.isFinite(n) || n < 0 || n > 365) throw new Error(`Tambahan hari metode ${method} tidak valid.`)
    methodDays[method] = n
  }
  return {
    days,
    methodDays,
    rate: number('rate', 1),
    minimum: number('minimum'),
    uncertainty: number('uncertainty', 0, 0.5),
    extraRoleDays: number('extraRoleDays', 0, 365),
    productionDays: number('productionDays', 0, 365),
    afterHoursDays: number('afterHoursDays', 0, 365),
    onsiteDays: number('onsiteDays', 0, 365),
    sizeUnit: number('sizeUnit', 1, 100000),
    sizeDays: number('sizeDays', 0, 365)
  }
}

export function calculate(scope, rules, version = null) {
  const needsReview = []
  if (!rules) needsReview.push('Tarif internal belum diaktifkan.')
  if (scope.method === 'unsure') needsReview.push('Metode pengujian perlu ditentukan.')
  if (scope.access === 'unsure') needsReview.push('Cara akses target perlu ditentukan.')
  if (scope.access === 'onsite') needsReview.push('Kebutuhan onsite perlu dikonfirmasi.')
  if (scope.roles === 'unknown') needsReview.push('Jumlah peran pengguna perlu dikonfirmasi.')
  if (scope.objects.some(item => item.size === 'unknown')) needsReview.push('Ukuran cakupan perlu dikonfirmasi.')
  if (scope.window === 'discuss') needsReview.push('Jadwal pengujian perlu dikonfirmasi.')
  if (scope.objects.length > 1 && scope.sharedTarget !== 'no') needsReview.push('Target atau backend yang digunakan bersama perlu diperiksa agar pekerjaan tidak dihitung dua kali.')
  if (!rules) return { status: 'review', reasons: needsReview, days: null, low: null, high: null, rulesVersion: version }
  let days = scope.objects.reduce((sum, item) => sum + item.count * rules.days[item.type] + (item.size === 'unknown' ? 0 : Math.max(0, Math.ceil(item.size / rules.sizeUnit) - 1) * rules.sizeDays), 0)
  days += rules.methodDays?.[scope.method] || 0
  if (typeof scope.roles === 'number') days += Math.max(0, scope.roles - 1) * rules.extraRoleDays
  if (scope.environment === 'production') days += rules.productionDays
  if (scope.window === 'after') days += rules.afterHoursDays
  if (scope.access === 'onsite') days += rules.onsiteDays
  days = Math.round(days * 10) / 10
  if (needsReview.length) return { status: 'review', reasons: needsReview, days: scope.objects.length > 1 && scope.sharedTarget !== 'no' ? null : days, low: null, high: null, rulesVersion: version }
  const base = Math.max(rules.minimum, days * rules.rate)
  const round = n => Math.round(n / 100000 + 1e-9) * 100000
  return { status: 'estimate', reasons: [], days, low: round(Math.max(rules.minimum, base * (1 - rules.uncertainty))), high: round(Math.max(rules.minimum, base * (1 + rules.uncertainty))), rulesVersion: version }
}

import test from 'node:test'
import assert from 'node:assert/strict'
import { calculate, validateRules, validateScope } from './pricing.js'

const scope = validateScope({ objects:[{type:'web',count:1,size:10}], method:'gray', environment:'staging', access:'internet', window:'business', roles:2 })
const rules = validateRules({ days:{web:3,api:2,mobile:4,infra:2}, methodDays:{black:0,gray:0,white:1}, rate:1000000, minimum:2000000, uncertainty:0.1, extraRoleDays:0.5, productionDays:1, afterHoursDays:1, onsiteDays:1, sizeUnit:10, sizeDays:0.5 })

test('tanpa tarif yang disetujui, hasil wajib ditinjau', () => {
  const result = calculate(scope, null)
  assert.equal(result.status, 'review')
  assert.equal(result.low, null)
})

test('aturan menghasilkan kisaran yang dapat ditelusuri', () => {
  const result = calculate(scope, rules, 1)
  assert.deepEqual({ status:result.status, days:result.days, low:result.low, high:result.high, rulesVersion:result.rulesVersion }, { status:'estimate', days:3.5, low:3200000, high:3900000, rulesVersion:1 })
})

test('cakupan tidak pasti dan beberapa objek menahan angka publik', () => {
  const result = calculate(validateScope({ ...scope, objects:[...scope.objects,{type:'api',count:1,size:'unknown'}] }), rules, 1)
  assert.equal(result.status, 'review')
  assert.equal(result.low, null)
  assert.ok(result.reasons.some(reason => reason.includes('tumpang tindih')))
})

test('input tidak valid ditolak', () => {
  assert.throws(() => validateScope({ ...scope, objects:[{type:'web',count:0,size:1}] }))
  assert.throws(() => validateScope({ ...scope, objects:[{type:'web',count:1,size:1},{type:'web',count:1,size:1}] }))
  assert.throws(() => validateRules({ ...rules, rate:-1 }))
})

test('metode pengujian mengubah estimasi hari dan harga', () => {
  const draft = validateRules({ ...rules, methodDays:{black:0,gray:1,white:3.5} })
  const base = { ...scope, roles:1 }
  const black = calculate({ ...base, method:'black' }, draft, 1)
  const gray = calculate({ ...base, method:'gray' }, draft, 1)
  const white = calculate({ ...base, method:'white' }, draft, 1)
  assert.equal(black.days, 3)
  assert.equal(gray.days, 4)
  assert.equal(white.days, 6.5)
  assert.ok(black.low < gray.low && gray.low < white.low)
})

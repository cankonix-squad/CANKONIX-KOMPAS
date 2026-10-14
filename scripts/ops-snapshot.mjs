import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const databasePath = path.join(process.env.DATA_DIR || path.join(projectRoot, 'data'), 'kompas.sqlite')
if (!fs.existsSync(databasePath)) throw new Error('Database KOMPAS tidak ditemukan.')

const database = new DatabaseSync(databasePath, { readOnly: true })
try {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const counts = (query, ...args) => database.prepare(query).all(...args)
  const snapshot = {
    checkedAt: new Date().toISOString(),
    includesTestData: true,
    eventsTotal: counts('SELECT kind, COUNT(*) AS total FROM events GROUP BY kind ORDER BY kind'),
    eventsLast24Hours: counts('SELECT kind, COUNT(*) AS total FROM events WHERE created_at >= ? GROUP BY kind ORDER BY kind', since),
    requestsByStatus: counts('SELECT status, COUNT(*) AS total FROM requests GROUP BY status ORDER BY status'),
    requestsLast24Hours: database.prepare('SELECT COUNT(*) AS total FROM requests WHERE created_at >= ?').get(since).total,
    publishedPricingVersion: database.prepare("SELECT MAX(version) AS version FROM rules WHERE status='published'").get().version
  }
  console.log(JSON.stringify(snapshot))
} finally {
  database.close()
}

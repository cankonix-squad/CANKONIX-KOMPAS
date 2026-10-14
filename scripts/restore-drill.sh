#!/bin/sh
set -eu

backup_root=/root/cankonix-node/backups/cankonix-kompas
container_name="kompas-restore-drill-$$"
temporary_data=""

cleanup() {
  docker rm -f "$container_name" >/dev/null 2>&1 || true
  if [ -n "$temporary_data" ] && [ -d "$temporary_data" ]; then
    case "$temporary_data" in
      "$backup_root"/restore-drill.*) rm -rf -- "$temporary_data" ;;
      *) echo 'Menolak membersihkan lokasi sementara yang tidak dikenali.' >&2 ;;
    esac
  fi
}
trap cleanup 0
trap 'exit 1' 1 2 3 15

latest_backup=""
for candidate in "$backup_root"/20??????T??????Z; do
  if [ -f "$candidate/kompas.sqlite" ]; then latest_backup="$candidate"; fi
done
if [ -z "$latest_backup" ]; then
  echo 'Backup SQLite KOMPAS tidak ditemukan.' >&2
  exit 1
fi

temporary_data=$(mktemp -d "$backup_root/restore-drill.XXXXXXXX")
cp -a "$latest_backup/." "$temporary_data/"
chown -R 1000:1000 "$temporary_data"
chmod 700 "$temporary_data"

docker run -d --name "$container_name" --network none \
  --mount "type=bind,source=$temporary_data,target=/data" \
  -e DATA_DIR=/data -e PORT=4173 -e COOKIE_SECURE=false \
  cankonix-kompas:latest >/dev/null

healthy=0
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if docker exec "$container_name" node -e "fetch('http://127.0.0.1:4173/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 1
done
if [ "$healthy" -ne 1 ]; then
  echo 'Aplikasi dari backup tidak sehat.' >&2
  docker logs --tail 20 "$container_name" >&2
  exit 1
fi

docker exec "$container_name" node -e '
  const { DatabaseSync } = require("node:sqlite")
  const database = new DatabaseSync("/data/kompas.sqlite", { readOnly: true })
  const integrity = database.prepare("PRAGMA integrity_check").get().integrity_check
  if (integrity !== "ok") throw new Error("Integritas backup gagal")
  const requests = database.prepare("SELECT COUNT(*) AS total FROM requests").get().total
  const pricingVersion = database.prepare("SELECT MAX(version) AS version FROM rules WHERE status=?").get("published").version
  console.log(JSON.stringify({ integrity, requests, pricingVersion }))
  database.close()
'
echo "Pemulihan terisolasi berhasil dari $(basename "$latest_backup")."

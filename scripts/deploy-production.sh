#!/bin/sh
set -eu

cd /root/cankonix-node/apps/cankonix-kompas
test -s .env
docker compose -f docker-compose.prod.yml config --quiet

current_container=$(docker compose -f docker-compose.prod.yml ps -q kompas)
current_image=""
if [ -n "$current_container" ]; then
  current_image=$(docker inspect --format '{{.Image}}' "$current_container")
fi

docker compose -f docker-compose.prod.yml build kompas

if [ -n "$current_container" ]; then
  docker compose -f docker-compose.prod.yml stop kompas
  backup_dir="/root/cankonix-node/backups/cankonix-kompas/$(date -u +%Y%m%dT%H%M%SZ)"
  mkdir -p "$backup_dir"
  docker cp "$current_container:/data/." "$backup_dir/"
  echo "Backup SQLite tersimpan di $backup_dir"
fi

rollback() {
  if [ -n "$current_image" ]; then
    echo 'Pemeriksaan gagal. Mengembalikan image sebelumnya.'
    docker tag "$current_image" cankonix-kompas:latest
    docker compose -f docker-compose.prod.yml up -d --no-build --force-recreate kompas
  fi
}

if ! docker compose -f docker-compose.prod.yml up -d --no-build kompas; then
  rollback
  exit 1
fi

healthy=0
for attempt in $(seq 1 24); do
  if docker compose -f docker-compose.prod.yml exec -T kompas node -e "fetch('http://127.0.0.1:4173/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 5
done
if [ "$healthy" -ne 1 ]; then
  rollback
  exit 1
fi

public=0
for attempt in $(seq 1 24); do
  if curl --fail --silent --show-error https://kompas.cankonix.com/api/health >/dev/null 2>&1; then
    public=1
    break
  fi
  sleep 5
done
if [ "$public" -ne 1 ]; then
  rollback
  exit 1
fi

docker compose -f docker-compose.prod.yml ps
echo 'KOMPAS siap di https://kompas.cankonix.com/'

# Rilis KOMPAS

Target: `https://kompas.cankonix.com/` pada VPS `187.77.127.202`, folder `/root/cankonix-node/apps/cankonix-kompas/`.

## CI/CD

Workflow `.github/workflows/ci-cd.yml` menjalankan `npm test` dan build Docker untuk pull request. Push ke `main` menjalankan tes yang sama, lalu mengirim sumber ke VPS dan menjalankan `scripts/deploy-production.sh`. Workflow dapat dijalankan ulang secara manual melalui GitHub Actions. Akses SSH memakai kunci deploy khusus pada secret `KOMPAS_DEPLOY_KEY` dan host key yang dipin pada `KOMPAS_KNOWN_HOST`.

File `.env` produksi berada di VPS, di luar Git, dengan izin `600`. Pipeline tidak menimpa file ini. Password admin dan draf tarif tidak dicatat dalam workflow atau repo. Harga draf harus diterbitkan oleh admin secara terpisah setelah disetujui.

Saat rilis fitur Pengguna internal, akun awal dari `.env` disalin satu kali ke tabel `users` di SQLite dengan password yang di-hash. Sesi yang sudah ada tetap berlaku selama akunnya aktif. Setelah migrasi, perubahan password dilakukan dari dashboard, bukan dengan mengedit `.env`; semua sesi akun akan dicabut. Pemilik sistem dapat membuat tautan undangan sekali pakai selama 24 jam dan membagikannya secara privat. Backup sebelum deploy mencakup tabel dan riwayat akun ini.

Compose produksi menetapkan `TRUST_PROXY=true` karena aplikasi hanya menerima lalu lintas publik melalui Traefik dan tidak membuka port host. Ini memungkinkan pembatasan permintaan memakai IP pengunjung dari `X-Forwarded-For`. Bila topologi proxy berubah, periksa kembali pengaturan ini agar header dari pengunjung tidak dipercaya langsung. Instalasi lokal memakai `TRUST_PROXY=false`.

## Deploy dan pemeriksaan

Script deploy memvalidasi Compose, membangun image baru, menghentikan container lama bila ada, menyalin isi volume SQLite ke `/root/cankonix-node/backups/cankonix-kompas/<waktu-UTC>/`, lalu menjalankan image baru. Pemeriksaan internal `/api/health` dan HTTPS domain harus lulus. Jika pemeriksaan gagal dan image lama tersedia, script mengembalikan image lama.

Setelah deploy, periksa formulir publik, permintaan proposal, login admin, dashboard, serta sertifikat HTTPS. Periksa container dengan `docker compose -f docker-compose.prod.yml ps` dan log dengan `docker compose -f docker-compose.prod.yml logs --tail=100 kompas` dari folder aplikasi VPS. Jangan gunakan data klien nyata untuk smoke test otomatis.

## Pemulihan

Untuk rollback kode setelah workflow selesai, jalankan ulang workflow pada commit sebelumnya atau kembalikan commit di `main`. Jika migrasi data bermasalah, hentikan container dan pulihkan isi volume dari backup terbaru yang dibuat sebelum deploy. Pemulihan database bersifat tindakan manual agar data baru tidak tertimpa tanpa pemeriksaan.

# KOMPAS

Aplikasi estimasi cakupan pentest Cankonix. Lihat [PRD.md](PRD.md) dan [TASKLIST.md](TASKLIST.md).

## Jalankan lokal

Memerlukan Node.js 24 atau lebih baru. Tidak ada langkah `npm install` karena aplikasi memakai modul bawaan Node.js.

1. Salin `.env.example` menjadi `.env`, lalu isi `ADMIN_EMAIL` dan `ADMIN_PASSWORD` dengan nilai lokal yang kuat. Akun `SALES_*`, `REVIEWER_*`, dan `PRICING_*` bersifat opsional; setiap password harus minimal 16 karakter.
2. Jalankan `node --env-file=.env server.js`.
3. Buka `http://localhost:4173/` untuk formulir dan `http://localhost:4173/admin` untuk dashboard.
4. Jalankan `npm test` untuk menguji kalkulasi dan validasi.

Data tersimpan dalam `data/kompas.sqlite`, yang diabaikan Git. `PRICING_SEED_JSON` pada `.env` dapat dipakai untuk membuat draf harga pada instalasi baru; kosongkan bila admin akan mengisi draf dari dashboard. [Referensi harga pasar](MARKET_REFERENCES.md) tidak menetapkan tarif Cankonix. Selama draf belum diterbitkan, hasil klien selalu **Perlu ditinjau**. Admin dapat mengubah draf lalu menerbitkan versinya setelah tarif internal disetujui. Jangan gunakan `.env.example` sebagai kredensial produksi.

Di dashboard, admin dapat meninjau angka, memilih **Lihat contoh harga**, lalu **Simpan draf**. Tombol **Terbitkan draf untuk klien** memakai versi draf yang tersimpan; perubahan yang belum disimpan tidak ikut terbit. Setiap estimasi menyimpan versi aturan saat dihitung.

Sebelum dipasang di domain HTTPS, set `COOKIE_SECURE=true`. Peran `sales` dan `reviewer` dapat meninjau serta memperbarui permintaan; peran `pricing` dapat mengubah aturan harga. Peran `admin` dapat keduanya.

## Catatan rilis

Target repo: `https://github.com/cankonix-squad/CANKONIX-KOMPAS`. Target domain: `https://kompas.cankonix.com/`. Detail server dan gerbang rilis ada di [TASKLIST.md](TASKLIST.md). Aplikasi belum dideploy.

`Dockerfile` dan `compose.example.yml` menyiapkan container dengan data SQLite persisten serta port yang hanya terbuka pada localhost VPS. `docker-compose.prod.yml` sudah mengacu pada jaringan Traefik `cankonix-proxy` dan domain produksi berdasarkan pemeriksaan read-only VPS. Sebelum mengaktifkannya, siapkan `.env` produksi di luar Git, backup volume, kebijakan penyimpanan data, serta pemeriksaan sertifikat dan akses admin.

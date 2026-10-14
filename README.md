# KOMPAS

Aplikasi estimasi cakupan pentest Cankonix. Lihat [PRD.md](PRD.md) dan [TASKLIST.md](TASKLIST.md).

## Jalankan lokal

Memerlukan Node.js 24 atau lebih baru. Tidak ada langkah `npm install` karena aplikasi memakai modul bawaan Node.js.

1. Salin `.env.example` menjadi `.env`, lalu isi `ADMIN_EMAIL` dan `ADMIN_PASSWORD` dengan nilai lokal yang kuat. Akun `SALES_*`, `REVIEWER_*`, dan `PRICING_*` bersifat opsional; setiap password harus minimal 16 karakter.
2. Jalankan `node --env-file=.env server.js`.
3. Buka `http://localhost:4173/` untuk formulir dan `http://localhost:4173/admin` untuk dashboard.
4. Jalankan `npm test` untuk menguji kalkulasi, validasi, dan alur API dengan database sementara.

Data tersimpan dalam `data/kompas.sqlite`, yang diabaikan Git. `PRICING_SEED_JSON` pada `.env` dapat dipakai untuk membuat draf harga pada instalasi baru; kosongkan bila admin akan mengisi draf dari dashboard. [Referensi harga pasar](MARKET_REFERENCES.md) tidak menetapkan tarif Cankonix. Selama draf belum diterbitkan, hasil klien selalu **Perlu ditinjau**. Admin dapat mengubah draf lalu menerbitkan versinya setelah tarif internal disetujui. Jangan gunakan `.env.example` sebagai kredensial produksi.

Di dashboard, admin dapat meninjau angka, memilih **Lihat contoh harga**, lalu **Simpan draf**. Tombol **Terbitkan draf untuk klien** memakai versi draf yang tersimpan; perubahan yang belum disimpan tidak ikut terbit. Setiap estimasi menyimpan versi aturan saat dihitung.

Klien baru cukup memasukkan nomor tiket KMP pada bagian bawah halaman utama untuk membuka kembali permintaannya. Nomor tiket baru berisi kode acak 128 bit dan menjadi akses rahasia selama 30 hari; jangan membagikannya secara publik. Tiket lama dengan kode pendek tetap membutuhkan tautan privat lama, atau admin/sales dapat memilih **Buat kode akses baru** pada detail permintaan. Kode baru ditampilkan sekali dan harus dibagikan secara privat; kode serta tautan sebelumnya langsung tidak berlaku. Admin/sales dapat mengisi harga penawaran final, ringkasan cakupan, dan masa berlaku pada detail permintaan. **Simpan draf penawaran** hanya menyimpan untuk internal; **Kirim penawaran ke klien** menerbitkan isinya pada halaman privat. Aplikasi belum mengirim email otomatis, jadi nomor tiket perlu disimpan dan dibagikan melalui proses komunikasi Cankonix.

Sebelum dipasang di domain HTTPS, set `COOKIE_SECURE=true`. Peran `sales` dan `reviewer` dapat meninjau serta memperbarui permintaan; peran `pricing` dapat mengubah aturan harga. Peran `admin` dapat keduanya.

## Catatan rilis

Target repo: `https://github.com/cankonix-squad/CANKONIX-KOMPAS`. Target domain: `https://kompas.cankonix.com/`. Detail server dan gerbang rilis ada di [TASKLIST.md](TASKLIST.md). Aplikasi belum dideploy.

`Dockerfile` dan `compose.example.yml` menyiapkan container dengan data SQLite persisten. `docker-compose.prod.yml` terhubung ke jaringan Traefik `cankonix-proxy`. Alur CI/CD, backup, pemeriksaan HTTPS, dan pemulihan dijelaskan di [DEPLOYMENT.md](DEPLOYMENT.md).

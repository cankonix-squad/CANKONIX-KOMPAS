# KOMPAS

Aplikasi estimasi cakupan pentest Cankonix. Lihat [PRD.md](PRD.md) dan [TASKLIST.md](TASKLIST.md).

## Jalankan lokal

Memerlukan Node.js 24 atau lebih baru. Tidak ada langkah `npm install` karena aplikasi memakai modul bawaan Node.js.

1. Salin `.env.example` menjadi `.env`, lalu isi `ADMIN_EMAIL` dan `ADMIN_PASSWORD` dengan nilai lokal yang kuat. Akun `SALES_*`, `REVIEWER_*`, dan `PRICING_*` bersifat opsional untuk instalasi awal; setiap password harus minimal 16 karakter.
2. Jalankan `node --env-file=.env server.js`.
3. Buka `http://localhost:4173/` untuk formulir dan `http://localhost:4173/admin` untuk dashboard.
4. Jalankan `npm test` untuk menguji kalkulasi, validasi, dan alur API dengan database sementara.

Data tersimpan dalam `data/kompas.sqlite`, yang diabaikan Git. `PRICING_SEED_JSON` pada `.env` dapat dipakai untuk membuat draf harga pada instalasi baru; kosongkan bila admin akan mengisi draf dari dashboard. [Referensi harga pasar](MARKET_REFERENCES.md) tidak menetapkan tarif Cankonix. Selama draf belum diterbitkan, hasil klien selalu **Perlu ditinjau**. Di menu kiri **Aturan harga**, admin/pengelola harga dapat mengubah draf dan melihat pratinjau seluruh kombinasi objek/metode serta kondisi tambahan sebelum menerbitkan. Harga kondisi diturunkan dari hari kerja dan faktor pada formulir, bukan disimpan sebagai daftar harga terpisah. Jangan gunakan `.env.example` sebagai kredensial produksi.

Akun dari `.env` hanya dipakai untuk membuat pengguna awal ketika tabel pengguna masih kosong. Setelah itu, login memakai akun database. Pemilik sistem membuka **Pengguna internal** di dashboard untuk membuat undangan sekali pakai bagi Admin, Sales, Reviewer teknis, atau Pengelola harga. Tautan undangan ditampilkan sekali, berlaku 24 jam, dan perlu dibagikan secara privat. Pemilik dapat mengubah peran, menonaktifkan akun, mencabut sesi, dan melihat riwayat perubahan. Setiap pengguna dapat mengganti password sendiri; semua sesinya akan dicabut. Mengubah password pada `.env` setelah akun awal dibuat tidak mengganti password login database.

Di dashboard, admin dapat meninjau angka, memilih **Lihat contoh harga**, lalu **Simpan draf**. Tombol **Terbitkan draf untuk klien** memakai versi draf yang tersimpan; perubahan yang belum disimpan tidak ikut terbit. Setiap estimasi menyimpan versi aturan saat dihitung.

Pada halaman pertama, klien mengisi nama lengkap, nama perusahaan, dan email kerja; jabatan serta nomor WhatsApp/telepon opsional. Data kontak dapat diubah dari halaman hasil dan baru dikirim ke server ketika klien menyetujui serta mengirim permintaan proposal. Klien baru cukup memasukkan nomor tiket KMP pada bagian bawah halaman utama untuk membuka kembali permintaannya. Nomor tiket baru berisi kode acak 128 bit dan menjadi akses rahasia selama 30 hari; jangan membagikannya secara publik. Tiket lama dengan kode pendek tetap membutuhkan tautan privat lama, atau admin/sales dapat memilih **Buat kode akses baru** pada detail permintaan. Kode baru ditampilkan sekali dan harus dibagikan secara privat; kode serta tautan sebelumnya langsung tidak berlaku. Admin/sales dapat mengisi harga penawaran final, ringkasan cakupan, dan masa berlaku pada detail permintaan. **Simpan draf penawaran** hanya menyimpan untuk internal; tombol **Terbitkan di halaman tiket** menampilkan isi draf tersimpan kepada klien. Perubahan formulir yang belum disimpan harus disimpan sebagai draf lebih dulu. Aplikasi belum mengirim email otomatis, jadi nomor tiket perlu disimpan dan dibagikan melalui proses komunikasi Cankonix.

Sebelum dipasang di domain HTTPS, set `COOKIE_SECURE=true`. Peran `sales` dan `reviewer` dapat meninjau serta memperbarui permintaan; peran `pricing` hanya dapat melihat dan mengubah aturan harga, tanpa akses ke data prospek. Peran `admin` dapat keduanya.

## Catatan rilis

Repo: `https://github.com/cankonix-squad/CANKONIX-KOMPAS`. Domain live: `https://kompas.cankonix.com/`. Status pengembangan dan pekerjaan lanjutan ada di [TASKLIST.md](TASKLIST.md). Aturan harga sementara versi 1 sudah diterbitkan pada 14 Oktober 2026; kisaran otomatis tampil untuk cakupan yang cukup jelas. Tarif dasar Rp6 juta per hari kerja dan harga minimum Rp20 juta tetap dapat direvisi admin melalui draf versi berikutnya.

`Dockerfile` dan `compose.example.yml` menyiapkan container dengan data SQLite persisten. `docker-compose.prod.yml` terhubung ke jaringan Traefik `cankonix-proxy`. Alur CI/CD, backup, pemeriksaan HTTPS, dan pemulihan dijelaskan di [DEPLOYMENT.md](DEPLOYMENT.md).

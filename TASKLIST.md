# Tasklist KOMPAS

**Acuan produk:** [PRD.md](PRD.md)  
**Status:** MVP sudah live melalui CI/CD; penyempurnaan produk dan persetujuan harga masih berjalan
**Tanggal:** 14 Oktober 2026

## Lokasi dan target rilis

| Kebutuhan | Lokasi/target |
| --- | --- |
| Folder kerja lokal | `/Users/cankonix/Documents/Cankonix Labs/KOMPAS` |
| Repo GitHub tujuan | `https://github.com/cankonix-squad/CANKONIX-KOMPAS` |
| Domain produksi | `https://kompas.cankonix.com/` |
| IP VPS target | `187.77.127.202` |
| Folder aplikasi pada VPS | `~/cankonix-node/apps/cankonix-kompas/` pada sesi `root@cankonix` |
| Acuan aset dan tampilan | `/Users/cankonix/Documents/Cankonix Labs/COMPLY` |

DNS `kompas.cankonix.com` mengarah ke `187.77.127.202`. Aplikasi berjalan di VPS melalui Docker Compose dan Traefik pada jaringan `cankonix-proxy`. Sertifikat HTTPS valid dan `/api/health` merespons 200 pada 14 Oktober 2026. Repo GitHub terhubung ke branch `main`; setiap push menjalankan tes, build, backup SQLite sebelum penggantian container, deploy, dan pemeriksaan HTTPS. Harga produksi masih berupa draf yang belum diterbitkan kepada klien.

## 1. Tetapkan keputusan produk sebelum kalkulator harga

- [x] Tetapkan daftar pertanyaan estimasi awal untuk Web Application, API, Mobile Application, dan Infrastruktur dari workbook sumber; pemetaan ada di `QUESTION_MAPPING.md`.
- [x] Pisahkan pertanyaan estimasi singkat dari pertanyaan pendalaman proposal; sediakan “Belum tahu” bila wajar. Kolom pendalaman khusus objek masih perlu dipilih sebelum rilis.
- [x] Siapkan draf tarif internal berdasarkan referensi pasar; dokumen rincian `PRICING_BENCHMARK.md` tetap lokal dan diabaikan Git. Sumber pembanding publik ada di `MARKET_REFERENCES.md`.
- [ ] Kalibrasi draf dengan biaya internal Cankonix, deliverable, retest, margin, dan pekerjaan yang tumpang tindih sebelum menerbitkan.
- [ ] Kalibrasi aturan dengan contoh proyek Cankonix; catat siapa yang menyetujui versi pertama.
- [x] Tentukan kondisi yang menampilkan kisaran rupiah dan kondisi yang wajib ditinjau manual; angka hanya tampil dari versi aturan yang sudah diterbitkan.
- [ ] Tetapkan masa berlaku estimasi, kebijakan penyimpanan data prospek, dan proses persetujuan proposal final.

**Selesai bila:** tabel input, aturan usaha, contoh hitung, dan keputusan harga publik dapat ditinjau tim bisnis serta teknis. Jangan mempublikasikan angka harga yang belum disetujui.

## 2. Siapkan proyek lokal dan repo

- [x] Periksa keadaan repo GitHub tujuan dan hak akses sebelum menyambungkan folder lokal; repo tampak belum memiliki commit pada pemeriksaan awal.
- [x] Tetapkan struktur aplikasi awal: Node.js 24, antarmuka HTML/CSS/JavaScript, dan SQLite.
- [x] Inisialisasi Git di folder KOMPAS dan sambungkan remote `origin`; workbook sumber tetap lokal dan diabaikan Git karena repo tujuan bersifat publik.
- [x] Tambahkan `.gitignore`, contoh variabel lingkungan tanpa rahasia, serta petunjuk `README.md` untuk setup dan menjalankan aplikasi lokal.
- [x] Salin aset logo yang diperlukan dari COMPLY ke proyek KOMPAS dengan lokasi dan nama yang jelas; jangan bergantung pada path lokal COMPLY saat build produksi.

**Selesai bila:** proyek dapat dijalankan dari checkout bersih dengan konfigurasi lokal yang terdokumentasi.

## 3. Bangun formulir dan hasil untuk klien

- [x] Buat halaman pembuka yang menjelaskan estimasi pentest dan bahwa harga bersifat indikatif.
- [x] Buat formulir bertahap tanpa login, termasuk pemilihan objek, jumlah, cakupan, metode Black Box/Gray Box/White Box, peran, lingkungan, konektivitas, dan jadwal.
- [x] Tampilkan pertanyaan khusus sesuai objek; sembunyikan yang tidak relevan.
- [x] Simpan progres sementara pada perangkat dan sediakan ringkasan sebelum menghitung.
- [x] Buat hasil berisi kisaran biaya atau “Perlu ditinjau”, estimasi hari kerja, asumsi, dan tombol “Minta proposal”.
- [x] Buat pengisian kontak dan persetujuan di tahap permintaan proposal, lalu berikan nomor referensi dan tautan privat untuk pendalaman.
- [x] Sediakan bagian di halaman utama untuk memasukkan nomor tiket KMP baru dan membuka kembali permintaan; tautan privat lama tetap didukung.
- [x] Gunakan nomor tiket baru dengan kode acak 128 bit sebagai akses rahasia selama 30 hari; tiket pendek lama tetap memerlukan token pada tautan privat.
- [x] Sediakan pembuatan ulang kode akses oleh admin/sales untuk permintaan lama; kode dan tautan sebelumnya dicabut saat kode baru dibuat.
- [x] Tampilkan penawaran final di halaman privat hanya setelah admin/sales menyimpan draf dan menerbitkannya.
- [x] Pastikan formulir tidak meminta password, API key, token, atau kredensial pengujian.

**Selesai bila:** calon klien dapat menyelesaikan alur di desktop dan ponsel tanpa akun, serta memahami hasil dan langkah berikutnya.

## 4. Bangun mesin estimasi dan penyimpanan

- [x] Modelkan objek, jawaban, estimasi, permintaan proposal, status prospek, aturan harga, dan riwayat aktivitas.
- [x] Implementasikan kalkulasi di sisi server memakai versi aturan yang tersimpan pada setiap estimasi, dengan draf awal yang tidak aktif bagi klien.
- [x] Tanyakan apakah beberapa objek berbagi target/backend. Jika ya atau belum tahu, tahan angka dan estimasi hari untuk pemeriksaan manusia; jika terpisah, hitung tiap objek.
- [x] Validasi angka dan pilihan di server; tangani jawaban kosong, “Belum tahu”, jumlah nol, dan input di luar batas.
- [x] Pastikan pengiriman berulang tidak membuat permintaan proposal ganda.
- [ ] Perkuat pembatasan permintaan dan pencegahan spam sebelum produksi; penanganan dasar sudah ada.

**Selesai bila:** contoh perhitungan yang disetujui menghasilkan hasil yang benar dan estimasi lama tidak berubah ketika aturan baru diterbitkan.

## 5. Bangun dashboard admin

- [x] Pisahkan hak akses sales/admin, reviewer teknis, dan pengelola harga melalui akun yang dikonfigurasi di lingkungan server.
- [x] Tampilkan metrik “mulai”, “selesai”, dan “minta proposal” per rentang tanggal dengan definisi yang jelas.
- [x] Buat daftar prospek, pencarian/filter, detail jawaban, estimasi, penanggung jawab, catatan, dan riwayat status.
- [x] Implementasikan status Baru, Perlu ditinjau, Dihubungi, Proposal dikirim, Menang, dan Tidak lanjut.
- [x] Batasi pengaturan harga menurut peran dan catat setiap perubahan; admin dapat menyimpan draf lalu menerbitkannya secara terpisah.
- [x] Admin/sales dapat menyiapkan harga penawaran final, ringkasan cakupan, dan masa berlaku; penerbitan dicatat dan draf tidak terlihat oleh klien.
- [x] Sediakan ekspor CSV untuk admin/sales; akses tanpa login dan peran lain ditolak.

**Selesai bila:** admin dapat memantau jumlah pengisi dan menindaklanjuti satu permintaan dari awal sampai keputusan akhir.

## 6. Terapkan tampilan dan bahasa

- [x] Gunakan logo Cankonix dari COMPLY, latar lingkaran gelap dan kartu abu-abu seperti halaman login Comply, serta header KOMPAS yang lebih besar.
- [x] Terapkan **Helvetica 14 px** untuk teks biasa dan **16 px** untuk heading; gunakan `Arial, sans-serif` sebagai fallback.
- [x] Tulis teks antarmuka dalam bahasa Indonesia yang mudah dipahami, sambil mempertahankan istilah assessment yang baku.
- [ ] Periksa tampilan desktop dan ponsel, kontras warna, fokus keyboard, label input, serta pesan kesalahan.

**Selesai bila:** halaman KOMPAS terlihat satu keluarga dengan Comply dan seluruh alur klien nyaman dipakai di ponsel.

## 7. Uji dan terima secara lokal

- [x] Uji API untuk setiap jenis objek, gabungan objek, “Belum tahu”, dan kasus yang wajib ditinjau manual.
- [ ] Uji contoh harga yang disetujui Cankonix. Batas minimum, perubahan versi aturan, dan pengiriman ganda sudah diuji dengan data sintetis.
- [x] Uji hak akses admin, tautan privat, masa berlaku token, dan pencatatan aktivitas melalui API lokal.
- [x] Uji metrik dashboard terhadap data permintaan sintetis yang dibuat saat pengujian.
- [ ] Jalankan pemeriksaan build dan pengujian yang tersedia; lakukan pemeriksaan langsung di browser pada desktop dan ponsel.
- [x] Periksa file yang dilacak Git: `.env`, SQLite, benchmark privat, dan workbook sumber diabaikan; tidak ada data klien nyata yang dimasukkan ke repo.

Pengujian API lokal memakai direktori SQLite sementara dan akun sintetis; jalankan dengan `npm test`. Pengujian browser desktop/ponsel dan contoh proyek Cankonix tetap diperlukan sebelum rilis.

**Selesai bila:** kriteria penerimaan MVP di PRD terpenuhi dan hasil pengujian lokal dicatat.

## 8. Siapkan repo dan rilis produksi

- [x] Tinjau perubahan, buat commit lokal, dan arahkan remote Git ke `https://github.com/cankonix-squad/CANKONIX-KOMPAS` setelah memastikan keadaan repo tujuan.
- [x] Push fondasi MVP yang lulus tes awal ke branch `main`; commit pertama `4950330` bukan kandidat rilis final.
- [x] Periksa DNS `kompas.cankonix.com` menuju IP target `187.77.127.202`.
- [x] Periksa sertifikat TLS domain KOMPAS; HTTPS valid dan container sehat.
- [x] Siapkan Dockerfile dan contoh Compose produksi; image berhasil dibangun dan health check merespons pada container lokal.
- [x] Siapkan konfigurasi produksi di luar repo, migrasi database otomatis, prosedur deploy, health check, dan langkah rollback dalam `DEPLOYMENT.md`.
- [x] Jalankan dan verifikasi workflow CI/CD GitHub Actions: tes, build Docker, backup SQLite, deploy VPS, dan pemeriksaan HTTPS. Dua run berhasil pada 14 Oktober 2026.
- [x] Jalankan smoke test pada domain produksi: halaman publik, estimasi, permintaan proposal sintetis, akses tiket privat, login admin, dashboard, dan HTTPS.
- [x] Verifikasi artefak backup SQLite sesudah deploy kedua; file ditemukan di VPS dan `PRAGMA integrity_check` menghasilkan `ok`.
- [ ] Pantau log serta metrik setelah rilis dan catat masalah beserta tindak lanjutnya.

**Status rilis:** sistem live. Harga otomatis tetap tersembunyi sampai draf tarif dikalibrasi dan diterbitkan oleh admin. Pemeriksaan browser desktop/ponsel, pembatasan spam, dan keputusan kebijakan prospek masih perlu diselesaikan sebelum promosi luas ke klien.

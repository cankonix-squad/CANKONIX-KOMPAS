# Tasklist KOMPAS

**Acuan produk:** [PRD.md](PRD.md)  
**Status:** Fondasi MVP lokal sudah di-push; belum deploy  
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

DNS `kompas.cankonix.com` sudah mengarah ke `187.77.127.202` pada pemeriksaan 14 Oktober 2026. Folder aplikasi VPS ada dan masih kosong saat diperiksa. Host VPS tidak memiliki perintah `node`; Docker tersedia. Traefik memakai jaringan `cankonix-proxy`, dan contoh layanan Comply memakai entrypoint `websecure` dengan resolver `letsencrypt`. Sertifikat untuk domain KOMPAS, backup volume, serta konfigurasi produksi KOMPAS sendiri belum diverifikasi. Repo GitHub awalnya belum memiliki commit; fondasi MVP kini ada pada branch `main`.

## 1. Tetapkan keputusan produk sebelum kalkulator harga

- [ ] Finalkan daftar pertanyaan estimasi awal untuk Web Application, API, Mobile Application, dan Infrastruktur dari workbook sumber.
- [ ] Pisahkan pertanyaan estimasi singkat dari pertanyaan pendalaman proposal; sediakan “Belum tahu” bila wajar.
- [ ] Tentukan tarif internal per hari kerja, usaha dasar per objek, tambahan usaha, batas minimum, rentang ketidakpastian, serta aturan pekerjaan yang tumpang tindih.
- [ ] Kalibrasi aturan dengan contoh proyek Cankonix; catat siapa yang menyetujui versi pertama.
- [ ] Tentukan kondisi yang menampilkan kisaran rupiah dan kondisi yang wajib ditinjau manual.
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
- [x] Pastikan formulir tidak meminta password, API key, token, atau kredensial pengujian.

**Selesai bila:** calon klien dapat menyelesaikan alur di desktop dan ponsel tanpa akun, serta memahami hasil dan langkah berikutnya.

## 4. Bangun mesin estimasi dan penyimpanan

- [x] Modelkan objek, jawaban, estimasi, permintaan proposal, status prospek, aturan harga, dan riwayat aktivitas.
- [x] Implementasikan kalkulasi di sisi server memakai versi aturan yang tersimpan pada setiap estimasi.
- [ ] Cegah hitung ganda bila beberapa objek berbagi target/backend; tandai kasus yang butuh pemeriksaan manusia.
- [x] Validasi angka dan pilihan di server; tangani jawaban kosong, “Belum tahu”, jumlah nol, dan input di luar batas.
- [x] Pastikan pengiriman berulang tidak membuat permintaan proposal ganda.
- [ ] Perkuat pembatasan permintaan dan pencegahan spam sebelum produksi; penanganan dasar sudah ada.

**Selesai bila:** contoh perhitungan yang disetujui menghasilkan hasil yang benar dan estimasi lama tidak berubah ketika aturan baru diterbitkan.

## 5. Bangun dashboard admin

- [x] Pisahkan hak akses sales/admin, reviewer teknis, dan pengelola harga melalui akun yang dikonfigurasi di lingkungan server.
- [x] Tampilkan metrik “mulai”, “selesai”, dan “minta proposal” per rentang tanggal dengan definisi yang jelas.
- [x] Buat daftar prospek, pencarian/filter, detail jawaban, estimasi, penanggung jawab, catatan, dan riwayat status.
- [x] Implementasikan status Baru, Perlu ditinjau, Dihubungi, Proposal dikirim, Menang, dan Tidak lanjut.
- [x] Batasi pengaturan harga menurut peran dan catat setiap perubahan; versi aturan sudah ada.
- [x] Sediakan ekspor CSV untuk admin/sales; akses tanpa login dan peran lain ditolak.

**Selesai bila:** admin dapat memantau jumlah pengisi dan menindaklanjuti satu permintaan dari awal sampai keputusan akhir.

## 6. Terapkan tampilan dan bahasa

- [x] Gunakan logo Cankonix dari COMPLY, warna utama dan pola kartu/navigasi yang serasi dengan `comply.cankonix.com`.
- [x] Terapkan **Helvetica 12 px** untuk teks biasa dan **14 px** untuk heading; gunakan `Arial, sans-serif` sebagai fallback.
- [x] Tulis teks antarmuka dalam bahasa Indonesia yang mudah dipahami, sambil mempertahankan istilah assessment yang baku.
- [ ] Periksa tampilan desktop dan ponsel, kontras warna, fokus keyboard, label input, serta pesan kesalahan.

**Selesai bila:** halaman KOMPAS terlihat satu keluarga dengan Comply dan seluruh alur klien nyaman dipakai di ponsel.

## 7. Uji dan terima secara lokal

- [ ] Uji alur setiap jenis objek, gabungan objek, “Belum tahu”, dan kasus yang wajib ditinjau manual.
- [ ] Uji contoh harga yang disetujui, batas minimum, perubahan versi aturan, dan pengiriman ganda.
- [ ] Uji hak akses admin, tautan privat, masa berlaku token, dan pencatatan aktivitas.
- [ ] Uji metrik dashboard terhadap data permintaan yang dibuat saat pengujian.
- [ ] Jalankan pemeriksaan build dan pengujian yang tersedia; lakukan pemeriksaan langsung di browser pada desktop dan ponsel.
- [ ] Periksa bahwa file rahasia, data klien nyata, dan kredensial tidak masuk ke Git.

**Selesai bila:** kriteria penerimaan MVP di PRD terpenuhi dan hasil pengujian lokal dicatat.

## 8. Siapkan repo dan rilis produksi

- [x] Tinjau perubahan, buat commit lokal, dan arahkan remote Git ke `https://github.com/cankonix-squad/CANKONIX-KOMPAS` setelah memastikan keadaan repo tujuan.
- [x] Push fondasi MVP yang lulus tes awal ke branch `main`; commit pertama `4950330` bukan kandidat rilis final.
- [x] Periksa DNS `kompas.cankonix.com` menuju IP target `187.77.127.202`.
- [ ] Periksa sertifikat TLS domain KOMPAS, backup volume SQLite, dan konfigurasi akhir VPS; Docker dan jaringan Traefik sudah diketahui, folder target masih kosong.
- [x] Siapkan Dockerfile dan contoh Compose produksi; image berhasil dibangun dan health check merespons pada container lokal.
- [ ] Siapkan konfigurasi produksi di luar repo, migrasi database, prosedur deploy, health check, dan langkah rollback.
- [ ] Jalankan smoke test pada domain produksi: halaman publik, estimasi, permintaan proposal, login admin, dashboard, dan HTTPS.
- [ ] Pantau log serta metrik setelah rilis dan catat masalah beserta tindak lanjutnya.

**Gerbang rilis:** rilis live dilakukan setelah kandidat lokal dapat ditinjau, aturan harga disetujui, konfigurasi produksi diperiksa, dan keputusan publikasi diberikan. Tasklist ini tidak berarti deployment telah dilakukan.

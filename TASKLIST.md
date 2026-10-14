# Tasklist KOMPAS

**Acuan produk:** [PRD.md](PRD.md)  
**Status:** MVP dan kisaran harga sementara sudah live; penyempurnaan produk dan kalibrasi harga lanjutan masih berjalan
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

DNS `kompas.cankonix.com` mengarah ke `187.77.127.202`. Aplikasi berjalan di VPS melalui Docker Compose dan Traefik pada jaringan `cankonix-proxy`. Sertifikat HTTPS valid dan `/api/health` merespons 200 pada 14 Oktober 2026. Repo GitHub terhubung ke branch `main`; setiap push menjalankan tes, build, backup SQLite sebelum penggantian container, deploy, dan pemeriksaan HTTPS. Aturan harga sementara versi 1 sudah diterbitkan kepada klien pada 14 Oktober 2026.

**Keputusan tarif sementara (14 Oktober 2026):** pemilik produk menyetujui penggunaan dasar Rp6.000.000 per hari kerja dan harga minimum Rp20.000.000 untuk sementara, lalu meminta sistem dilanjutkan sampai harga live. Aturan versi 1 telah diterbitkan melalui alur admin setelah pratinjau 12 kombinasi dasar diperiksa. Angka tetap dapat direvisi melalui draf versi berikutnya; kalibrasi dengan biaya/proyek nyata masih terbuka.

## 1. Tetapkan keputusan produk sebelum kalkulator harga

- [x] Tetapkan daftar pertanyaan estimasi awal untuk Web Application, API, Mobile Application, dan Infrastruktur dari workbook sumber; pemetaan ada di `QUESTION_MAPPING.md`.
- [x] Pisahkan pertanyaan estimasi singkat dari pertanyaan pendalaman proposal; sediakan “Belum tahu” bila wajar. Kolom pendalaman khusus objek masih perlu dipilih sebelum rilis.
- [x] Siapkan draf tarif internal berdasarkan referensi pasar; dokumen rincian `PRICING_BENCHMARK.md` tetap lokal dan diabaikan Git. Sumber pembanding publik ada di `MARKET_REFERENCES.md`.
- [x] Catat persetujuan pemilik produk atas tarif dasar sementara Rp6 juta per hari kerja dan minimum Rp20 juta; angka dapat direvisi admin.
- [x] Terbitkan aturan harga sementara versi 1 melalui alur admin setelah memeriksa 12 contoh harga dasar dan uji estimasi publik di domain produksi.
- [x] Siapkan lembar kalibrasi privat untuk biaya harian, margin, deliverable, retest, pekerjaan yang tumpang tindih, dan tiga proyek pembanding; isian bisnis masih menunggu Cankonix.
- [x] Siapkan rancangan keputusan masa berlaku estimasi, penyimpanan prospek, dan persetujuan penawaran di `POLICY_DRAFT.md`; penerapan menunggu keputusan Cankonix.
- [ ] Kalibrasi lanjutan aturan yang sudah terbit dengan biaya internal Cankonix, deliverable, retest, margin, dan pekerjaan yang tumpang tindih; revisi tarif melalui draf versi berikutnya.
- [ ] Bandingkan aturan versi 1 dengan contoh proyek Cankonix; catat penanggung jawab kalibrasi dan penyetuju revisi berikutnya.
- [x] Tentukan kondisi yang menampilkan kisaran rupiah dan kondisi yang wajib ditinjau manual; angka hanya tampil dari versi aturan yang sudah diterbitkan.
- [ ] Tetapkan masa berlaku estimasi, kebijakan penyimpanan data prospek, dan proses persetujuan proposal final.

**Selesai bila:** tabel input, aturan usaha, contoh hitung, dan keputusan harga publik dapat ditinjau tim bisnis serta teknis. Versi 1 adalah tarif sementara yang disetujui pemilik produk; setiap revisi perlu ditinjau sebelum diterbitkan.

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
- [x] Pindahkan pengisian data diri dan perusahaan ke bagian atas halaman pertama: nama lengkap, perusahaan, dan email kerja wajib; jabatan serta nomor telepon opsional. Tampilkan ringkasan dan opsi ubah pada halaman hasil; persetujuan tetap diberikan saat meminta proposal. Data kontak baru dikirim ke server setelah permintaan dikirim.
- [x] Sediakan kartu data diri yang dapat dibuka dan ditutup; tampilkan keterangan “(Opsional)” sejajar dengan label jabatan dan telepon. Jika data wajib kurang, kartu terbuka kembali dan fokus menuju kolom yang perlu diperbaiki.
- [ ] Tinjau tampilan dan alur data diri baru di desktop/ponsel bersama pemilik produk setelah deploy.
- [x] Sediakan bagian di halaman utama untuk memasukkan nomor tiket KMP baru dan membuka kembali permintaan; tautan privat lama tetap didukung.
- [x] Gunakan nomor tiket baru dengan kode acak 128 bit sebagai akses rahasia selama 30 hari; tiket pendek lama tetap memerlukan token pada tautan privat.
- [x] Sediakan pembuatan ulang kode akses oleh admin/sales untuk permintaan lama; kode dan tautan sebelumnya dicabut saat kode baru dibuat.
- [x] Tampilkan tanggal kedaluwarsa kode akses yang sedang dipakai pada halaman tiket, termasuk setelah admin/sales membuat kode baru.
- [x] Tampilkan penawaran final di halaman privat hanya setelah admin/sales menyimpan draf dan menerbitkannya.
- [x] Pastikan formulir tidak meminta password, API key, token, atau kredensial pengujian.

**Selesai bila:** calon klien dapat menyelesaikan alur di desktop dan ponsel tanpa akun, serta memahami hasil dan langkah berikutnya.

## 4. Bangun mesin estimasi dan penyimpanan

- [x] Modelkan objek, jawaban, estimasi, permintaan proposal, status prospek, aturan harga, dan riwayat aktivitas.
- [x] Implementasikan kalkulasi di sisi server memakai versi aturan yang tersimpan pada setiap estimasi, dengan draf awal yang tidak aktif bagi klien.
- [x] Pisahkan status tarif internal dari hasil klien; tampilkan hanya rincian cakupan yang akan dikonfirmasi bersama tim Cankonix.
- [x] Tanyakan apakah beberapa objek berbagi target/backend. Jika ya atau belum tahu, tahan angka dan estimasi hari untuk pemeriksaan manusia; jika terpisah, hitung tiap objek.
- [x] Validasi angka dan pilihan di server; tangani jawaban kosong, “Belum tahu”, jumlah nol, dan input di luar batas.
- [x] Pastikan pengiriman berulang tidak membuat permintaan proposal ganda.
- [x] Simpan waktu dan versi kalimat persetujuan kontak untuk permintaan baru agar riwayat persetujuan dapat ditelusuri.
- [x] Perkuat pembatasan permintaan per pengunjung di belakang Traefik, batas khusus login dan proposal, pembersihan penghitung, serta kolom perangkap bot tanpa langkah tambahan bagi klien.

**Selesai bila:** contoh perhitungan yang disetujui menghasilkan hasil yang benar dan estimasi lama tidak berubah ketika aturan baru diterbitkan.

## 5. Bangun dashboard admin

- [x] Pisahkan hak akses sales/admin, reviewer teknis, dan pengelola harga melalui akun yang dikonfigurasi di lingkungan server.
- [x] Batasi Pengelola harga ke aturan harga; daftar, detail, dan ekspor prospek ditolak oleh API dan tidak ditampilkan di dashboard peran tersebut.
- [x] Tampilkan metrik “mulai”, “selesai”, dan “minta proposal” per rentang tanggal dengan definisi yang jelas.
- [x] Buat daftar prospek, pencarian/filter, detail jawaban, estimasi, penanggung jawab, catatan, dan riwayat status.
- [x] Sajikan cakupan awal dan detail klien di halaman permintaan admin sebagai poin berlabel yang mudah dibaca, termasuk nilai “Belum tahu” dan “Belum diisi”, tanpa menampilkan JSON.
- [x] Implementasikan status Baru, Perlu ditinjau, Dihubungi, Proposal dikirim, Menang, dan Tidak lanjut.
- [x] Batasi pengaturan harga menurut peran dan catat setiap perubahan; admin dapat menyimpan draf lalu menerbitkannya secara terpisah.
- [x] Tampilkan draf tarif yang sudah tersedia di menu **Aturan harga** beserta pratinjau 12 kombinasi objek/metode dan dampak kondisi tambahan; angka dapat diedit tanpa otomatis diterbitkan.
- [x] Tambahkan navigasi sisi kiri pada dashboard admin untuk ringkasan, permintaan, pengguna, aturan harga, dan password; di ponsel menu menjadi baris yang dapat digeser.
- [x] Admin/sales dapat menyiapkan harga penawaran final, ringkasan cakupan, dan masa berlaku; penerbitan dicatat dan draf tidak terlihat oleh klien.
- [x] Tampilkan ringkasan draf penawaran tersimpan di admin, wajibkan penyimpanan perubahan sebelum terbit, dan jelaskan bahwa penerbitan menampilkan penawaran di halaman tiket tanpa email otomatis.
- [x] Sediakan ekspor CSV untuk admin/sales; akses tanpa login dan peran lain ditolak.
- [x] Tambahkan halaman **Pengguna internal** khusus pemilik sistem: undang beberapa Admin/Sales/Reviewer/Pengelola harga, ubah peran, nonaktifkan akun, dan cabut sesi aktif. Undangan sekali pakai berlaku 24 jam; password di-hash dengan salt; perubahan tercatat dalam riwayat; akun pemilik tidak dapat dinonaktifkan. Akun awal dari `.env` dimigrasikan satu kali ke database.
- [x] Sediakan penggantian password mandiri yang mencabut seluruh sesi akun.
- [ ] Tinjau langsung alur undangan pengguna baru dan tampilan tabel akun pada desktop/ponsel setelah rilis fitur.

**Selesai bila:** admin dapat memantau jumlah pengisi dan menindaklanjuti satu permintaan dari awal sampai keputusan akhir.

## 6. Terapkan tampilan dan bahasa

- [x] Gunakan logo Cankonix dari COMPLY, latar lingkaran gelap dan kartu abu-abu seperti halaman login Comply, serta header KOMPAS yang lebih besar.
- [x] Terapkan **Helvetica 14 px** untuk teks biasa dan **16 px** untuk heading; gunakan `Arial, sans-serif` sebagai fallback.
- [x] Tulis teks antarmuka dalam bahasa Indonesia yang mudah dipahami, sambil mempertahankan istilah assessment yang baku.
- [x] Periksa tampilan visual desktop dan ponsel; pemilik produk menyatakan keduanya aman pada 14 Oktober 2026.
- [x] Perbaiki navigasi keyboard tabel permintaan admin: tiap referensi memakai tombol yang dapat difokuskan; tabel akun memiliki header dan label peran yang jelas.
- [x] Pindahkan fokus ke judul saat admin membuka detail permintaan atau kembali ke dashboard; umumkan pesan kesalahan login dan perubahan permintaan kepada pembaca layar.
- [x] Catat audit kode dan rasio warna awal di `ACCESSIBILITY_AUDIT.md`; tandai kolom kontak yang salah agar pesan kesalahannya terhubung untuk pembaca layar.
- [x] Validasi angka cakupan sebelum pindah langkah; tampilkan kesalahan di dekat kolom yang salah dan fokuskan kolom tersebut.
- [x] Tampilkan kesalahan persetujuan kontak di dekat checkbox saat mengirim proposal, dengan fokus dan hubungan pesan untuk pembaca layar.
- [x] Tampilkan kesalahan pemilihan objek di dekat pilihan dan fokuskan pilihan pertama saat klien belum memilih objek.
- [ ] Periksa kontras warna, fokus keyboard, label input, dan pesan kesalahan secara khusus untuk aksesibilitas. Fokus judul saat berpindah langkah dan penanda langkah aktif sudah ditambahkan; verifikasi langsung tetap diperlukan.

**Selesai bila:** halaman KOMPAS terlihat satu keluarga dengan Comply dan seluruh alur klien nyaman dipakai di ponsel.

## 7. Uji dan terima secara lokal

- [x] Uji API untuk setiap jenis objek, gabungan objek, “Belum tahu”, dan kasus yang wajib ditinjau manual.
- [ ] Uji contoh harga yang disetujui Cankonix. Batas minimum, perubahan versi aturan, dan pengiriman ganda sudah diuji dengan data sintetis.
- [x] Uji hak akses admin, tautan privat, masa berlaku token, dan pencatatan aktivitas melalui API lokal.
- [x] Uji alur penawaran lokal dari draf internal hingga harga, ringkasan, dan masa berlaku terlihat melalui tiket klien setelah terbit.
- [x] Uji metrik dashboard terhadap data permintaan sintetis yang dibuat saat pengujian.
- [x] Pemeriksaan visual langsung di browser desktop dan ponsel dinyatakan aman oleh pemilik produk; tes API, pemeriksaan sintaks JavaScript, dan build Docker di CI/CD juga lulus.
- [x] Periksa file yang dilacak Git: `.env`, SQLite, benchmark privat, dan workbook sumber diabaikan; tidak ada data klien nyata yang dimasukkan ke repo.

Pengujian API lokal memakai direktori SQLite sementara dan akun sintetis; jalankan dengan `npm test`. Contoh proyek Cankonix dan audit aksesibilitas khusus masih diperlukan.

**Selesai bila:** kriteria penerimaan MVP di PRD terpenuhi dan hasil pengujian lokal dicatat.

## 8. Siapkan repo dan rilis produksi

- [x] Tinjau perubahan, buat commit lokal, dan arahkan remote Git ke `https://github.com/cankonix-squad/CANKONIX-KOMPAS` setelah memastikan keadaan repo tujuan.
- [x] Push fondasi MVP yang lulus tes awal ke branch `main`; commit pertama `4950330` bukan kandidat rilis final.
- [x] Periksa DNS `kompas.cankonix.com` menuju IP target `187.77.127.202`.
- [x] Periksa sertifikat TLS domain KOMPAS; HTTPS valid dan container sehat.
- [x] Siapkan Dockerfile dan contoh Compose produksi; image berhasil dibangun dan health check merespons pada container lokal.
- [x] Siapkan konfigurasi produksi di luar repo, migrasi database otomatis, prosedur deploy, health check, dan langkah rollback dalam `DEPLOYMENT.md`.
- [x] Jalankan dan verifikasi workflow CI/CD GitHub Actions: tes, build Docker, backup SQLite, deploy VPS, dan pemeriksaan HTTPS. Dua run berhasil pada 14 Oktober 2026.
- [x] Perbarui checkout dan setup-node GitHub Actions ke runtime Node 24; nonaktifkan cache package manager otomatis yang tidak diperlukan proyek ini.
- [x] Jalankan smoke test pada domain produksi: halaman publik, estimasi, permintaan proposal sintetis, akses tiket privat, login admin, dashboard, dan HTTPS.
- [x] Verifikasi artefak backup SQLite sesudah deploy kedua; file ditemukan di VPS dan `PRAGMA integrity_check` menghasilkan `ok`.
- [x] Periksa kondisi awal setelah rilis pada 14 Oktober 2026: container sehat, log aplikasi tanpa kesalahan, pipeline terakhir berhasil. Dashboard berisi satu permintaan sintetis bertanda “UJI SISTEM”, belum ada permintaan klien nyata.
- [x] Ulangi pemeriksaan kesehatan, log, dan angka agregat produksi pada 14 Oktober 2026; hasil dicatat di `OPERATIONS_LOG.md` tanpa data pribadi.
- [x] Sediakan skrip snapshot operasional baca-saja untuk jumlah peristiwa, status permintaan, dan versi harga aktif tanpa menampilkan data pribadi.
- [ ] Lanjutkan pemantauan log dan metrik berkala saat klien mulai menggunakan sistem; catat masalah dan tindak lanjutnya.

**Status rilis:** sistem dan kisaran harga otomatis sementara sudah live. Kondisi yang belum jelas tetap menampilkan “Perlu ditinjau”, dan penawaran final baru terlihat pada tiket setelah diterbitkan Admin/Sales. Audit aksesibilitas khusus dan keputusan kebijakan prospek masih perlu diselesaikan sebelum promosi luas ke klien.

# PRD KOMPAS

**KOMPAS — Kalkulasi Objek & Metode Pentest Assessment Sistem**  
**Status:** Draf awal untuk ditinjau  
**Tanggal:** 14 Oktober 2026  
**Pemilik produk:** Cankonix

## 1. Ringkasan

KOMPAS adalah sistem untuk membantu calon klien menjelaskan kebutuhan pentest, memperoleh kisaran biaya awal, dan meminta proposal. Tim Cankonix menggunakan dashboard admin untuk meninjau permintaan, menetapkan harga akhir, serta memantau tindak lanjut. Pengalaman klien menggunakan bahasa Indonesia yang mudah dipahami; istilah baku seperti **Black Box**, **Gray Box**, **White Box**, **API**, **endpoint**, dan **retest** tetap digunakan dengan penjelasan singkat.

Kisaran biaya yang tampil di tahap awal bersifat **indikatif**, bukan penawaran final. Proposal resmi diterbitkan setelah cakupan dan kondisi pengujian diperiksa oleh tim Cankonix.

## 2. Latar belakang dan masalah

Workbook `Application_Scope_Asessment_Update-1.xlsx` berisi kuesioner untuk web application, infrastruktur, mobile application, dan API. Pertanyaannya berguna untuk pengumpulan cakupan, tetapi beberapa sheet berulang, sebagian pertanyaan terlalu rinci untuk kontak pertama, dan belum ada aturan harga. Mengirim seluruh workbook kepada calon klien akan membuat proses awal terasa berat dan sulit dipantau.

KOMPAS mengubah kuesioner tersebut menjadi alur singkat yang menanyakan informasi minimum lebih dulu. Detail teknis dikumpulkan hanya bila relevan dan ketika klien ingin melanjutkan ke proposal.

## 3. Tujuan dan ukuran keberhasilan

| Tujuan | Ukuran awal |
| --- | --- |
| Memudahkan klien meminta estimasi | Klien dapat menyelesaikan formulir awal tanpa akun dan dari ponsel. |
| Membantu tim menyiapkan penawaran | Setiap permintaan menghasilkan ringkasan objek, cakupan, asumsi, dan kisaran estimasi. |
| Memantau permintaan masuk | Admin dapat melihat jumlah formulir dimulai, diselesaikan, dan permintaan proposal per periode. |
| Menjaga harga tetap terkendali | Tarif dan aturan kalkulasi hanya dapat diubah oleh admin berwenang; harga akhir disetujui manusia. |

Angka target konversi dan waktu penyelesaian formulir ditetapkan setelah ada data penggunaan awal.

## 4. Pengguna

1. **Calon klien:** ingin memahami kebutuhan dan kisaran biaya tanpa harus menguasai istilah teknis atau membuat akun.
2. **Admin/sales Cankonix:** memantau prospek, memeriksa jawaban, menghubungi klien, dan menyiapkan proposal.
3. **Reviewer teknis Cankonix:** memeriksa cakupan, usaha pengujian, pengecualian, dan kelayakan estimasi.
4. **Pengelola harga:** mengatur tarif internal, batas minimum, dan aturan kalkulasi.

Satu orang dapat memegang lebih dari satu peran internal pada tahap awal.

## 5. Cakupan MVP

### 5.1 Alur klien

1. Klien membuka halaman KOMPAS dari situs Cankonix tanpa login.
2. Klien memilih satu atau lebih objek: **Web Application**, **API**, **Mobile Application**, atau **Infrastruktur**.
3. Formulir menampilkan pertanyaan dasar dan pertanyaan khusus sesuai objek. Ada indikator langkah dan ringkasan jawaban sebelum dikirim.
4. Sistem menampilkan kisaran estimasi, asumsi utama, apa yang termasuk, serta faktor yang dapat mengubah harga.
5. Klien boleh meminta proposal dengan mengisi nama, perusahaan, email kerja, dan pilihan cara dihubungi. Persetujuan untuk dihubungi harus jelas.
6. Sistem memberi nomor referensi dan tautan privat untuk melengkapi informasi. Tautan memiliki masa berlaku dan dapat dicabut.
7. Setelah permintaan proposal, klien dapat mengisi detail tambahan secara bertahap. Kredensial, token, dan rahasia lain tidak diminta melalui formulir estimasi.
8. Klien dapat memasukkan nomor tiket KMP baru pada halaman utama untuk membuka kembali permintaannya. Nomor tiket dibuat acak dengan kekuatan 128 bit, menjadi kode akses rahasia, dan berlaku 30 hari. Tiket lama yang pendek tetap memerlukan tautan privat; admin/sales dapat membuat kode akses baru untuk permintaan lama, yang mencabut akses sebelumnya. Saat tim menerbitkan penawaran, harga final, ringkasan cakupan, dan masa berlaku terlihat di halaman privat.

Formulir awal tidak mensyaratkan akun. Simpan progres lokal pada perangkat agar isian tidak hilang saat halaman tertutup; penyimpanan server dan pemulihan lintas perangkat dimulai setelah klien meminta proposal dan memakai tautan privat.

### 5.2 Pertanyaan awal yang ditampilkan kepada klien

| Kelompok | Pertanyaan utama | Bentuk jawaban |
| --- | --- | --- |
| Objek | Apa yang ingin diuji? | Pilihan banyak objek. |
| Jumlah | Berapa aplikasi, API, aplikasi mobile, atau host yang akan diuji? | Angka per objek; hindari perhitungan ganda. |
| Platform mobile | Android, iOS, atau keduanya? | Pilihan hanya saat Mobile Application dipilih; “Belum tahu” tersedia. |
| Cakupan | Seberapa besar cakupannya? | Kisaran sederhana seperti fitur utama, jumlah endpoint, atau jumlah host. Sediakan pilihan “Belum tahu”. |
| Akses | Jenis pengujian yang diinginkan? | Black Box, Gray Box, White Box, atau “Bantu tentukan”, masing-masing dengan penjelasan singkat. |
| Peran | Berapa jenis akun/peran pengguna yang perlu diuji? | Angka/kisaran; muncul bila relevan. |
| Lingkungan | Di mana pengujian dilakukan? | Production, staging, atau lainnya. |
| Konektivitas | Apakah target dapat diakses dari internet atau perlu VPN/onsite? | Pilihan sesuai objek. |
| Jadwal | Kapan pengujian boleh dilakukan? | Jam kerja, di luar jam kerja, atau perlu dijadwalkan. |
| Kebutuhan | Apakah ada tenggat atau kebutuhan khusus? | Opsional, teks singkat. |

Detail seperti URL/IP lengkap, daftar fitur atau endpoint, dokumentasi, versi aplikasi, batasan pengujian, pihak ketiga, dan akses pengujian diminta pada tahap pendalaman. Pertanyaan yang tidak relevan disembunyikan.

### 5.3 Hasil estimasi

Hasil menampilkan: objek dan jumlahnya, metode pengujian, asumsi cakupan, estimasi durasi dalam hari kerja, **kisaran biaya dalam rupiah**, status “perlu ditinjau” bila data belum cukup, serta tombol **Minta proposal**. Jika terlalu banyak jawaban “Belum tahu” atau permintaan berada di luar aturan kalkulasi, sistem tidak memaksakan angka dan mengarahkan ke peninjauan manual.

### 5.4 Dashboard admin

Admin login untuk melihat:

- Ringkasan periode: pengisian dimulai, estimasi selesai, proposal diminta, dan rasio antar tahap.
- Daftar permintaan dengan pencarian dan filter tanggal, objek, status, serta penanggung jawab.
- Detail setiap permintaan: jawaban, versi aturan harga yang digunakan, estimasi, catatan internal, dan riwayat perubahan status.
- Status: **Baru**, **Perlu ditinjau**, **Dihubungi**, **Proposal dikirim**, **Menang**, **Tidak lanjut**. Alasan “Tidak lanjut” dapat dicatat.
- Ekspor data prospek dan ringkasan untuk pelaporan internal, sesuai hak akses.
- Admin atau sales dapat menyimpan draf penawaran final dan menerbitkannya secara eksplisit. Draf tetap internal; penawaran yang diterbitkan terlihat pada tautan privat klien dan tercatat dalam riwayat.

**Pengelolaan pengguna internal (tahap berikutnya):** akun produksi awal `admin@cankonix.com` menjadi pemilik sistem. Pemilik dapat membuat undangan sekali pakai untuk akun baru, memilih peran Admin, Sales, Reviewer, atau Pengelola harga, menonaktifkan akun, serta mencabut sesi aktifnya. Tautan undangan dapat disalin dan dibagikan secara privat sampai pengiriman email otomatis tersedia. Password pengguna disimpan sebagai hash dengan salt, tidak ditampilkan kembali setelah dibuat. Setiap perubahan akun dan peran dicatat dalam riwayat. Pemilik tidak dapat menonaktifkan akun pemilik terakhir. Pengguna biasa tidak dapat menaikkan perannya sendiri.

Jumlah **pengunjung halaman** adalah metrik analitik situs yang terpisah dari jumlah **orang yang mulai mengisi**. Pengukuran “mulai” dilakukan saat pengguna berinteraksi dengan formulir; pengukuran “selesai” saat estimasi berhasil dibuat. Dashboard harus menjelaskan definisi metrik ini.

### 5.5 Pengaturan harga internal

Pengelola harga dapat menetapkan tarif dasar dan aturan usaha per objek, batas minimum harga, serta pengaruh faktor seperti kompleksitas, jumlah peran, lingkungan production, pengujian di luar jam kerja, onsite, laporan, dan retest. Setiap perubahan aturan disimpan sebagai versi dengan tanggal berlaku. Estimasi lama tetap merujuk pada versi aturan saat estimasi dibuat.

## 6. Prinsip kalkulasi

Kalkulasi dimulai dari **estimasi hari kerja** untuk tiap objek. Usaha tambahan dihitung dari cakupan dan faktor pengujian yang relevan; objek yang berbagi target atau backend perlu diperiksa agar tidak dihitung dua kali. Total usaha kemudian dikonversi menggunakan tarif internal, batas minimum, dan ketentuan komersial untuk menghasilkan kisaran biaya indikatif.

Rumus konseptual:

`Usaha = usaha dasar per objek + tambahan cakupan + tambahan kondisi pengujian − penyesuaian pekerjaan yang tumpang tindih`

`Kisaran biaya = usaha × tarif internal, dengan batas minimum dan rentang ketidakpastian`

Workbook sumber tidak menyediakan data harga atau realisasi usaha proyek. Sumber pembanding publik tercatat di `MARKET_REFERENCES.md`; draf tarif harian Cankonix disimpan dalam konfigurasi/database internal dan bukan tarif final sampai ditinjau. Sebelum kalkulator harga dipublikasikan, admin meninjau biaya internal, mengubah draf bila perlu, lalu menerbitkan versinya. Penyimpanan draf saja tidak mengaktifkan harga publik. Harga proposal final tetap memerlukan persetujuan internal.

## 7. Persyaratan pengalaman dan bahasa

- Gunakan bahasa Indonesia sehari-hari: “Apa yang ingin diuji?”, “Berapa jumlahnya?”, “Kapan pengujian boleh dilakukan?”.
- Jelaskan istilah teknis tepat saat ditanyakan, misalnya “Gray Box: pengujian dengan akun pengguna yang disediakan”.
- Tampilkan satu kelompok pertanyaan per langkah dan perkiraan progres. Pilihan “Belum tahu” harus tersedia untuk pertanyaan yang wajar belum diketahui calon klien.
- Formulir nyaman digunakan pada layar ponsel, dapat dinavigasi dengan keyboard, dan menampilkan kesalahan pengisian di dekat pertanyaan terkait.
- Hindari meminta informasi yang tidak diperlukan untuk estimasi. Tampilkan alasan singkat bila sebuah data diperlukan.
- Hasil estimasi harus menyebutkan masa berlaku, asumsi, dan bahwa angka final mengikuti peninjauan cakupan.

### 7.1 Identitas visual dan acuan COMPLY

Tampilan KOMPAS harus terasa sebagai bagian dari keluarga produk **Cankonix Comply**. Gunakan aset dan pola antarmuka dari folder `../COMPLY` sebagai sumber utama saat desain dan implementasi. Jangan menggambar ulang logo atau membuat palet baru bila aset dan token yang sesuai sudah tersedia.

- **Logo:** gunakan `../COMPLY/frontend/public/assets/cankonix/logo-white.png` pada latar gelap dan `../COMPLY/frontend/public/assets/cankonix/logo-black.png` pada latar terang. Aset sumber beresolusi lebih tinggi tersedia di `../COMPLY/assets/cankonix logo/`.
- **Font dan token dasar:** rujuk warna dan token pada `../COMPLY/frontend/src/index.css`, tetapi gunakan **Helvetica** untuk KOMPAS. Teks biasa berukuran **14 px** dan semua heading **16 px**; hierarki heading dibedakan lewat ketebalan, warna, dan jarak, bukan ukuran font. Gunakan fallback `Arial, sans-serif` bila Helvetica tidak tersedia. Warna dasar gelap `#111111`, teks terang `#f5f5f5`, dan aksen biru `#1769e0` / `#2f80ff`.
- **Halaman assessment publik:** gunakan pola latar lingkaran gelap dan kartu kaca abu-abu pada `../COMPLY/frontend/src/pages/auth/AuthPages.css`, sesuai contoh visual yang dipilih. Header KOMPAS dibuat lebih tinggi dengan logo dan nama produk lebih besar. Pertanyaan, tombol, tabel, dan halaman admin memakai warna teks terang yang tetap terbaca.
- **Dashboard admin:** gunakan struktur navigasi dan komponen yang serasi dengan dashboard Comply; kepadatan informasi boleh berbeda sesuai kebutuhan pemantauan prospek.

Kriteria penerimaan visual: saat halaman KOMPAS dan Comply dibuka berdampingan, logo, warna utama, tombol, kartu, dan navigasi terlihat konsisten; tipografi KOMPAS mengikuti ketentuan Helvetica 14 px/16 px di atas. Formulir tetap nyaman pada layar ponsel. Pemeriksaan ini dilakukan saat implementasi, bukan hanya berdasarkan dokumen.

## 8. Data, keamanan, dan privasi

- Data prospek dan cakupan hanya dapat dilihat oleh pengguna internal sesuai hak akses.
- Catat persetujuan kontak, waktu pengiriman, dan versi pernyataan privasi yang disetujui.
- Tautan privat memakai token acak, masa berlaku, dan mekanisme pencabutan; jangan menaruh jawaban sensitif di URL.
- Lindungi data saat dikirim dan disimpan. Catat aktivitas penting admin, termasuk perubahan status, harga, dan aturan kalkulasi.
- Tetapkan kebijakan penyimpanan serta penghapusan data prospek sebelum peluncuran.
- Jangan menerima password, API key, token, atau kredensial pengujian melalui formulir publik. Mekanisme pertukaran akses pengujian ditentukan pada proses proyek.
- Terapkan pembatasan permintaan dan pencegahan spam pada formulir publik tanpa mempersulit klien yang sah.

## 9. Di luar cakupan MVP

- Pembayaran atau checkout otomatis.
- Pemesanan jadwal pentest otomatis.
- Pembuatan proposal kontraktual tanpa peninjauan manusia.
- Portal pelaksanaan pentest, temuan, dan laporan teknis.
- Integrasi CRM atau pesan otomatis yang kompleks.

Fitur tersebut dapat dipertimbangkan setelah data penggunaan dan proses internal stabil.

## 10. Kriteria penerimaan MVP

1. Klien dapat membuat estimasi untuk setiap jenis objek yang didukung tanpa akun dan tanpa mengisi detail teknis yang belum diketahui.
2. Pertanyaan lanjutan berubah sesuai objek dan jawaban; objek lain tidak memunculkan pertanyaan yang tidak relevan.
3. Hasil menampilkan kisaran biaya atau status “perlu ditinjau” beserta alasannya, bukan harga pasti tanpa asumsi.
4. Permintaan proposal tersimpan sekali dengan nomor referensi; admin dapat membukanya, mengubah status, memberi catatan, dan melihat riwayatnya.
5. Dashboard menghitung “mulai”, “selesai”, dan “minta proposal” secara konsisten pada rentang tanggal yang dipilih.
6. Perubahan aturan harga tidak mengubah estimasi yang telah dibuat sebelumnya.
7. Admin yang tidak berwenang tidak dapat mengubah aturan harga atau melihat data di luar hak aksesnya.
8. Formulir dan hasil dapat dipakai dengan nyaman pada ponsel serta menggunakan bahasa Indonesia yang mudah dipahami.

## 11. Keputusan yang masih diperlukan

1. **Kalibrasi tarif:** draf biaya minimum dan tarif per hari kerja sudah ada; target margin, data proyek terdahulu, cakupan deliverable, retest, biaya perjalanan, dan perlakuan pajak masih perlu disepakati sebelum penerbitan harga.
2. **Kebijakan harga publik:** apakah kisaran rupiah langsung ditampilkan untuk semua kasus atau kasus tertentu hanya menerima “perlu ditinjau”.
3. **Proposal:** format proposal, siapa yang menyetujui harga final, dan jalur pengiriman kepada klien.
4. **Integrasi akun:** KOMPAS ditargetkan pada `kompas.cankonix.com`; tentukan apakah login admin memakai akun Cankonix Comply yang sudah ada atau akun terpisah.
5. **Data:** masa simpan prospek, kebijakan penghapusan, dan alat analitik situs yang dipilih.

## 12. Sumber awal

- `Application_Scope_Asessment_Update-1.xlsx` di folder ini: daftar pertanyaan cakupan untuk Web Application, Infrastruktur, Mobile Application, dan API.
- Halaman rujukan pengalaman pengguna: `https://comply.cankonix.com/self-assessment/iso-27001`. Struktur dan interaksi halaman perlu ditinjau langsung saat desain antarmuka.
- Aset dan kode tampilan lokal: `../COMPLY/frontend/public/assets/cankonix/`, `../COMPLY/frontend/src/index.css`, dan `../COMPLY/frontend/src/pages/public/GuestIso27001Assessment.css`.

# Pemeriksaan aksesibilitas KOMPAS

**Status:** pemeriksaan kode dan warna awal selesai; pengujian langsung dengan keyboard dan pembaca layar masih terbuka.

## Sudah diperiksa

- Formulir klien memiliki label pada kolom kontak, cakupan, akses, dan jadwal. Pesan kesalahan menggunakan `role="alert"`.
- Kolom kontak yang gagal validasi ditandai `aria-invalid="true"`, dihubungkan dengan pesan melalui `aria-describedby`, dan menerima fokus. Penanda dihapus setelah kolom diperbaiki.
- Angka jumlah objek, ukuran cakupan, dan peran diperiksa sebelum pindah langkah. Kesalahan tampil pada label kolom terkait, terhubung dengan `aria-describedby`, dan kolom yang salah menerima fokus.
- Persetujuan kontak yang belum dicentang kini menampilkan pesan di dekat checkbox, menghubungkan pesan dengan `aria-describedby`, dan memfokuskan checkbox. Pesan dibersihkan saat pilihan diubah.
- Jika belum ada objek yang dipilih, pesan muncul langsung setelah pilihan objek. Grup ditandai tidak valid, pesan terhubung ke checkbox pertama, dan fokus pindah ke pilihan tersebut.
- Judul langkah klien dan judul detail admin menerima fokus setelah tampilan berpindah. Nomor permintaan admin berupa tombol yang dapat dijangkau dengan keyboard.
- Tabel permintaan dan pengguna admin memiliki header kolom; kolom pilihan peran pengguna memiliki label aksesibel.
- Aturan `:focus-visible` memberi garis fokus yang terlihat. Menu admin dan tombol memakai elemen interaktif asli.
- Perhitungan warna contoh pada latar gelap `#303030`: teks kartu `12,11:1`, teks redup `7,81:1`, placeholder `6,15:1`, tombol `9,59:1`, pesan kesalahan `7,26:1`, dan tautan `7,77:1`. Kartu memakai latar transparan sehingga angka akhir perlu diperiksa pada tampilan yang dirender.

## Masih perlu diuji langsung

- Jalankan seluruh formulir klien dengan Tab, Shift+Tab, Enter, dan Space pada desktop serta ponsel.
- Periksa pengumuman kesalahan dan perubahan langkah menggunakan pembaca layar.
- Uji alur undangan pengguna serta tabel akun admin pada ukuran desktop dan ponsel.
- Periksa kontras warna pada hasil render sebenarnya, termasuk teks pada kartu transparan dan keadaan fokus.

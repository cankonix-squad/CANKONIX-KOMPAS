# Rancangan keputusan operasional KOMPAS

**Status:** usulan untuk ditinjau Cankonix; belum menjadi kebijakan yang diterapkan otomatis.

## Keadaan sistem saat ini

- Nomor tiket privat berlaku 30 hari dan dapat dibuat ulang oleh Admin/Sales.
- Hasil estimasi awal belum memiliki masa berlaku tersendiri.
- Admin/Sales menentukan tanggal akhir setiap penawaran final saat menyimpan draf.
- Admin dan Sales sama-sama dapat menerbitkan draf penawaran; tindakan penerbitan dicatat.
- Data prospek belum dihapus otomatis. Berakhirnya kode tiket hanya mencabut akses klien, bukan menghapus datanya.
- Persetujuan kontak saat mengirim proposal dicatat dengan waktu dan, untuk permintaan baru, versi `v1-2026-10-14`. Kalimat versi ini: “Saya setuju dihubungi oleh Cankonix terkait permintaan proposal ini.”

## Usulan keputusan

| Hal | Usulan awal | Perlu diputuskan oleh Cankonix |
| --- | --- | --- |
| Masa berlaku kisaran estimasi | 14 hari sejak dihitung; setelah itu klien meminta pembaruan. | Setuju atau tentukan jangka lain, lalu setujui teks yang tampil kepada klien. |
| Masa berlaku penawaran final | Admin/Sales memilih tanggal pada tiap draf; anjuran awal 14 hari. | Apakah perlu batas minimum/maksimum dan apakah penawaran yang lewat tanggal masih boleh dilihat. |
| Persetujuan harga final | Admin/Sales yang menekan **Terbitkan di halaman tiket** bertanggung jawab menyetujui harga, cakupan, deliverable, dan tanggal berlaku; sistem mencatat pelakunya. | Apakah peran Sales boleh menerbitkan sendiri atau perlu persetujuan Admin untuk kondisi tertentu. |
| Prospek yang tidak lanjut/tidak merespons | Tinjau untuk dihapus 180 hari setelah aktivitas terakhir. | Tetapkan masa simpan, pengecualian, dan siapa yang boleh menghapus. |
| Prospek yang menjadi proyek | Pindahkan ke aturan penyimpanan dokumen proyek/kontrak Cankonix. | Tetapkan aturan proyek dan hubungan dengan backup. |
| Permintaan hapus data | Sediakan prosedur verifikasi identitas dan pencatatan tindak lanjut manual terlebih dahulu. | Tentukan kontak penanggung jawab dan prosedur operasional. |
| Backup | Penghapusan dari database aktif perlu diselaraskan dengan siklus backup. | Tetapkan masa simpan backup dan prosedur pemulihan tanpa menghidupkan kembali data yang telah dihapus. |

**Dasar pertimbangan:** [UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi](https://peraturan.go.id/files/Salinan%2BUU%2BNomor%2B27%2BTahun%2B2022.pdf) mengatur pengakhiran pemrosesan dan penghapusan ketika masa retensi atau tujuan pemrosesan selesai, serta dalam keadaan permintaan subjek data. Angka **180 hari** dan **14 hari** di atas adalah usulan operasional KOMPAS, bukan angka yang ditentukan oleh undang-undang tersebut. Tinjau bersama penanggung jawab privasi Cankonix sebelum mengaktifkan penghapusan otomatis.

## Dampak implementasi setelah disetujui

1. Tampilkan tanggal kedaluwarsa pada hasil estimasi dan jelaskan cara memperoleh estimasi baru.
2. Tambahkan informasi masa simpan dan kontak permintaan penghapusan pada formulir serta catat versi teks yang disetujui.
3. Buat daftar prospek yang mencapai batas simpan untuk ditinjau Admin sebelum penghapusan; jangan menghapus otomatis saat kebijakan belum disetujui.
4. Jika persetujuan dua tahap dipilih, pisahkan tombol menyetujui dari tombol menerbitkan dan catat kedua aktor.

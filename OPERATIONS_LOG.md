# Catatan pemantauan KOMPAS

## 14 Oktober 2026

- Endpoint `https://kompas.cankonix.com/api/health` merespons `{"ok":true}`.
- Container `kompas` berstatus `healthy`; log aplikasi 24 jam terakhir tidak menunjukkan kesalahan.
- Agregat database: 4 sesi mulai, 4 estimasi selesai, 2 permintaan proposal. Dua permintaan berstatus `Baru`. Angka ini mencakup pengujian; belum dapat dipakai sebagai jumlah klien nyata.
- Aturan harga produksi: 1 draf, belum ada versi yang diterbitkan. Kisaran harga otomatis tetap tidak ditampilkan.

### Aktivasi harga sementara

- Pemilik produk menyetujui tarif dasar Rp6 juta per hari kerja dan minimum Rp20 juta untuk sementara serta meminta sistem dilanjutkan sampai live.
- Draf produksi versi 1 cocok dengan angka tersebut. Pratinjau 12 kombinasi objek/metode dasar menghasilkan kisaran valid di atas batas minimum; aturan diterbitkan melalui endpoint admin dan tercatat sebagai versi 1.
- Pemeriksaan publik sesudah penerbitan: `/api/health` merespons `ok`; Web Application Black Box, 1 objek/10 fitur, staging, 1 peran menghasilkan 4 hari kerja dan kisaran Rp20,4–27,6 juta dengan `rulesVersion: 1`.
- Pemeriksaan estimasi publik ini adalah data uji dan menambah satu peristiwa `complete` pada metrik; jangan tafsirkan sebagai aktivitas klien nyata.
- Pemeriksaan berikutnya setelah deploy: container `healthy`; log aplikasi hanya menampilkan pesan mulai; agregat 4 sesi mulai, 5 estimasi selesai, 2 permintaan proposal berstatus `Baru`, dan 1 aturan harga `published`. Selisih satu estimasi selesai berasal dari uji harga publik.

Pemeriksaan berikutnya: bedakan data uji dari prospek nyata di dashboard, pantau permintaan baru dan kesalahan aplikasi, lalu catat tindak lanjut tanpa menyalin data pribadi ke dokumen ini.

Untuk snapshot agregat berikutnya, jalankan `docker compose -f docker-compose.prod.yml exec -T kompas node scripts/ops-snapshot.mjs` dari folder aplikasi VPS. Skrip membaca SQLite tanpa mengubah data dan menandai bahwa angka masih mencakup data uji. Periksa `/api/health` dan log container secara terpisah.

### Uji pemulihan terisolasi

- Backup `20261014T163806Z` disalin ke direktori sementara pada VPS dan dijalankan melalui image KOMPAS terpisah dengan `--network none`; volume produksi tidak dipasang.
- Endpoint kesehatan merespons berhasil; `PRAGMA integrity_check` menghasilkan `ok`; salinan berisi 2 permintaan dan aturan harga terbit versi 1.
- Container dan direktori sementara uji sudah dibersihkan. Prosedur dapat diulang lewat `scripts/restore-drill.sh`.

## 15 Oktober 2026 — pemantauan otomatis

- Workflow `KOMPAS Monitor` menerima hasil CI/CD branch `main` dan pemeriksaan HTTPS manual berhasil.
- Uji issue peringatan pertama menemukan jeda indeks GitHub: issue terbuat, tetapi pencarian pada detik yang sama belum menemukannya. Alur uji diperbaiki dengan memakai nomor issue hasil pembuatan secara langsung; issue #1 yang tertinggal lalu ditutup.
- Uji berikutnya membuat issue #2, menugaskannya ke `cankonix-squad`, dan menutupnya otomatis setelah pemeriksaan berhasil. Tidak ada issue uji terbuka.
- Run terjadwal yang teramati pada 14 Oktober 2026 pukul 20:21 dan 23:19 UTC berhasil. Jaraknya lebih panjang dari target 15 menit; pemantauan GitHub Actions ini bersifat best-effort.
- Endpoint produksi `/api/health` tetap merespons `{"ok":true}` setelah deploy terakhir.

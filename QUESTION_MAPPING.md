# Pemetaan pertanyaan KOMPAS

Sumber: `Application_Scope_Asessment_Update-1.xlsx` (workbook lokal, tidak diunggah ke repo). Pemetaan ini hanya memuat jenis pertanyaan, tanpa jawaban contoh pada workbook.

## Estimasi awal untuk semua objek

| Pertanyaan singkat | Alasan masuk estimasi awal | Bila belum tahu |
| --- | --- | --- |
| Jenis objek dan jumlahnya | Menentukan usaha dasar per objek. | Jenis objek wajib dipilih; jumlah minimal satu. |
| Ukuran cakupan: fitur utama, endpoint, atau host/IP | Menentukan tambahan usaha. | Boleh kosong; hasil perlu ditinjau. |
| Metode Black Box, Gray Box, atau White Box | Mempengaruhi cara dan usaha pengujian. | Pilih “Bantu tentukan”; hasil perlu ditinjau. |
| Jumlah jenis akun/peran | Mempengaruhi pengujian otorisasi. | Boleh kosong; hasil perlu ditinjau. |
| Lingkungan, cara akses, dan waktu pengujian | Mempengaruhi jadwal dan kebutuhan teknis. | Pilihan “Belum tahu” atau “Perlu dijadwalkan” tersedia bila relevan. |
| Target atau backend digunakan bersama | Menghindari perhitungan ganda antar objek. | Boleh “Belum tahu”; angka ditahan untuk ditinjau. |
| Platform Android/iOS untuk Mobile Application | Dua platform dapat menambah cakupan. | Boleh “Belum tahu”; dua platform atau tidak pasti ditinjau manual. |

Pertanyaan awal mengikuti sheet `Object-Web_Application_Sample` baris 4–26, `Object-Infrastructure_sample` baris 4–17, `Mobile_Apps_Sample(Android&iOS)` baris 4–29, dan `Object-API-Endpoint_Apps_Sample` baris 4–29. Sheet `Web_Application_` dan dua salinannya berisi pertanyaan pendalaman yang lebih rinci; ketiganya tidak perlu dijadikan tiga formulir terpisah.

## Setelah klien meminta proposal

| Objek | Informasi pendalaman yang diminta/ditinjau | Rujukan workbook |
| --- | --- | --- |
| Web Application | URL target, fitur kritis, pengecualian, fungsi bisnis, teknologi, autentikasi, integrasi, hosting, dan batasan pengujian. | `Object-Web_Application_Sample` baris 9–26; `Web_Application_` baris 8–44. |
| API | Base URL, jumlah dan daftar endpoint, dokumentasi/collection, metode autentikasi, peran, integrasi, dan pengecualian. | `Object-API-Endpoint_Apps_Sample` baris 9–29. |
| Mobile Application | Nama dan versi aplikasi, versi OS, tautan store, API/backend, root detection, SSL pinning, enkripsi, fitur prioritas, dan pengecualian. | `Mobile_Apps_Sample(Android&iOS)` baris 9–29. |
| Infrastruktur | Daftar IP/host, sistem operasi, lokasi/akses jaringan, lingkungan, dan pengecualian. | `Object-Infrastructure_sample` baris 9–17. |

Formulir pendalaman saat ini menyediakan kolom umum untuk target, bagian dalam/luar cakupan, dokumentasi, dan tenggat. Tim Cankonix menindaklanjuti butir khusus objek secara manual. Sebelum rilis, perlu diputuskan butir khusus mana yang perlu ditambahkan sebagai kolom terstruktur tanpa membuat pengisian awal menjadi panjang. Kredensial pengujian tidak diminta melalui KOMPAS.

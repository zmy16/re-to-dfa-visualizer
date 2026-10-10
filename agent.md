# Panduan Agen: RE to DFA Visualizer

## Sumber acuan

- Baca `overview.md` untuk metode, model data, dan modul aplikasi.
- Baca `spec.md` untuk cakupan produk, perilaku, dan kriteria penerimaan.
- `Design/design.md`, `Design/stitch-prompt.md`, dan `Design/index-*.html` adalah artefak Hemory, bukan rancangan RE to DFA. Jangan salin nama produk, konten, navigasi, atau klaimnya. Perlakukan hanya sebagai referensi visual jika pemilik proyek menyetujuinya.

## Saat mengerjakan proyek

1. Pastikan kebutuhan yang belum diputuskan pada `spec.md` sebelum mengubah perilaku terkait.
2. Implementasikan konversi langsung RE ke DFA melalui AST, `nullable`/`firstpos`/`lastpos`, `followpos`, lalu konstruksi state; jangan sisipkan tahap NFA.
3. Pisahkan logika konversi dari tampilan. Semua tabel, diagram, dan simulator harus memakai hasil konversi yang sama.
4. Validasi ekspresi dan tampilkan kesalahan yang bisa ditindaklanjuti; jangan menampilkan hasil lama seolah-olah berasal dari input baru.
5. Uji kasus operator, prioritas, kurung, transisi, state penerima, dan string diterima/ditolak. Verifikasi interaksi serta layout desktop dan mobile.
6. Jangan menyebut DFA minimal tanpa langkah minimisasi dan pembuktian lewat pengujian.

## Batas saat ini

Repositori baru berisi dokumentasi dan contoh HTML Hemory. Belum ada implementasi, dependensi, atau perintah build yang dapat dijadikan acuan.

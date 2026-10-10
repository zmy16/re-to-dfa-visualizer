# PRD: RE to DFA Visualizer

## Ringkasan

RE to DFA Visualizer adalah aplikasi web satu halaman untuk membantu mahasiswa, dosen, dan praktisi memahami konversi regular expression (RE) menjadi deterministic finite automaton (DFA) melalui syntax tree dan `followpos`, tanpa NFA perantara. Hasil perhitungan dapat ditelusuri, bukan hanya dilihat sebagai diagram akhir.

## Pengguna dan kebutuhan

- Mahasiswa: memeriksa setiap tahap konversi dan mencoba string untuk memahami hasil.
- Dosen: memperagakan hubungan antara posisi daun, `followpos`, transisi, dan state penerima.
- Praktisi: memeriksa perilaku RE sederhana terhadap contoh string.

## Tujuan produk

1. Menghasilkan DFA hasil konstruksi langsung dari RE yang valid.
2. Menampilkan tahap perhitungan yang konsisten dengan DFA akhir.
3. Memungkinkan pengujian string langkah demi langkah.
4. Menjelaskan kesalahan input tanpa menampilkan hasil lama sebagai hasil input baru.

## Cakupan rilis awal

- Input RE dan pilihan preset, dengan validasi sintaks.
- Konkatenasi eksplisit (`•`) dan augmentasi `(r)•#`.
- AST dengan anotasi `nullable`, `firstpos`, dan `lastpos`.
- Tabel `followpos` yang dapat menyorot posisi terkait pada AST.
- Tabel transisi dan diagram state DFA yang menunjukkan state awal dan penerima.
- Simulator string dengan urutan state dan hasil diterima atau ditolak.
- Antarmuka responsif yang dapat digunakan dengan keyboard.

## Alur pengguna

1. Pengguna memasukkan RE atau memilih preset.
2. Pengguna menjalankan konversi; input tidak valid menampilkan pesan kesalahan yang menunjuk bagian bermasalah.
3. Pengguna membaca AST, `followpos`, tabel transisi, dan diagram yang berasal dari satu hasil konversi.
4. Pengguna memilih baris `followpos` untuk menemukan posisi daun pada AST.
5. Pengguna memasukkan string dan mengikuti transisi hingga hasil akhir terlihat.

## Kriteria keberhasilan

- Contoh `a`, `a*`, `a|b`, `ab`, dan `(a|b)*abb` menghasilkan penerimaan atau penolakan sesuai kasus pada `spec.md`.
- Posisi, ID state, dan transisi cocok di seluruh tampilan dan simulator.
- Input tidak valid menghasilkan pesan yang dapat dibaca dan tidak menghasilkan visualisasi parsial yang menyesatkan.
- Alur input, inspeksi, dan simulasi berfungsi pada desktop, mobile, dan keyboard.

## Di luar cakupan yang belum disepakati

- Minimisasi DFA: metode `followpos` membangun DFA langsung, tetapi tidak menjamin jumlah state minimum.
- Sintaks epsilon, escape operator, dan simbol literal `#` atau `•` masih perlu diputuskan.
- Penyimpanan hasil, ekspor, akun, kolaborasi, dan layanan backend tidak ditetapkan untuk rilis awal.

## Ketergantungan keputusan

Sebelum implementasi, sepakati aturan sintaks input, kebutuhan minimisasi, teknologi aplikasi, dan arah visual. Berkas `Design/` menggambarkan produk Hemory, sehingga tidak menjadi sumber kebutuhan atau identitas RE to DFA.

## Referensi

- `overview.md`: dasar teori, model data, dan pipeline konversi.
- `spec.md`: perilaku rinci dan kriteria penerimaan.
- `agent.md`: panduan kerja untuk agen pengembang.

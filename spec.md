# Spesifikasi Produk: RE to DFA Visualizer

## Tujuan

Aplikasi web satu halaman untuk mempelajari konversi regular expression (RE) menjadi deterministic finite automaton (DFA) secara langsung menggunakan syntax tree dan `followpos`, tanpa NFA perantara. Pengguna dapat memeriksa perhitungan dan menguji string pada hasilnya.

## Alur utama

1. Pengguna memasukkan RE atau memilih preset, lalu menjalankan konversi.
2. Aplikasi memvalidasi ekspresi, menyisipkan operator konkatenasi eksplisit (`•`), dan mengaugmentasi ekspresi sebagai `(r)•#`.
3. Parser membangun AST dengan prioritas `*` > konkatenasi > `|`; tanda kurung mengubah pengelompokan.
4. Setiap node memperoleh `nullable`, `firstpos`, dan `lastpos` secara bottom-up. Posisi daun bernomor unik.
5. Konkatenasi dan Kleene star menghasilkan himpunan `followpos` per posisi daun.
6. DFA dibangun dari `firstpos(root)`. Untuk setiap state dan simbol alfabet selain `#`, gabungkan `followpos` posisi dengan simbol tersebut. State yang mengandung posisi `#` menjadi state penerima.
7. Aplikasi menyajikan AST beranotasi, tabel `followpos`, tabel transisi, diagram state, dan simulator string langkah demi langkah.

## Antarmuka dan perilaku

- Input menerima alfabet bebas satu karakter: huruf, angka, atau simbol. Operator: `|`, `*`, tanda kurung, konkatenasi eksplisit `•` atau `.`, dan `E` untuk string kosong. Sediakan preset untuk kasus sederhana dan bertingkat.
- Kesalahan sintaks menunjukkan lokasi atau bagian ekspresi yang bermasalah. Input kosong atau tidak valid tidak menghasilkan diagram yang tampak sah.
- Klik baris `followpos` menyorot posisi daun terkait pada AST, state DFA yang memuat posisi itu, dan transisi yang dipicunya. Klik kedua menghapus sorotan. Untuk posisi yang tidak muncul di state mana pun (misalnya daun epsilon), tampil keterangan alasannya.
- Tabel dan diagram menunjukkan ID state, himpunan posisi, state awal, state penerima, serta transisi per simbol dengan label konsisten.
- Simulator menerima string, menampilkan state awal, transisi tiap simbol, dan hasil diterima/ditolak; simbol di luar alfabet atau transisi yang tidak ada menghasilkan penolakan yang jelas.
- Tampilan responsif dan dapat dioperasikan melalui keyboard. Status kosong dan kesalahan input terlihat jelas.
- Tabel DFA berupa satu tabel gabungan dengan kolom `State`, kolom per simbol alfabet, lalu `Peran`. Setiap nama state ditulis lengkap bersama himpunan posisinya, misalnya `S0 = {1,2,3}`. Nama state memakai pola `S0`, `S1`, `S2` agar tidak tertukar dengan simbol alfabet.
- Pengguna dapat berpindah antara DFA hasil konstruksi langsung dan DFA minimum; tabel, diagram, dan simulator selalu memakai view yang sama. Pada view minimum, panel langkah minimisasi menampilkan partisi Moore putaran demi putaran dengan tombol Sebelumnya dan Berikutnya.

## Model data

Gunakan bentuk `SyntaxTreeNode`, `FollowposEntry`, `DFAState`, dan `DFATransition` pada `overview.md` sebagai kontrak awal. Satu hasil konversi menjadi sumber data seluruh visualisasi dan simulator.

## Kriteria penerimaan

- Untuk RE `a`, state awal menerima transisi `a` menuju state penerima; string `a` diterima, string kosong dan `aa` ditolak.
- Untuk RE `a*`, string kosong, `a`, dan `aaa` diterima; `b` ditolak.
- Untuk RE `a|b`, `a` dan `b` diterima; `ab` ditolak.
- Untuk RE `ab`, hanya `ab` diterima dari contoh `a`, `b`, `ab`, dan `abb`.
- RE `(a|b)*abb` menghasilkan tabel, diagram, dan simulasi yang konsisten; `abb` dan `aabb` diterima, `aba` ditolak.
- Kurung tidak seimbang, operator tanpa operand, dan karakter yang tidak didukung menghasilkan kesalahan yang dapat dibaca, bukan hasil parsial.
- Perubahan input atau preset memperbarui semua view secara konsisten; langkah simulator tidak memakai state dari hasil konversi sebelumnya.
- Escape: `\x` menjadikan `x` simbol literal, termasuk operator. `a|\*` menerima `a` dan `*`, serta menampilkan `*` sebagai kolom alfabet.
- `E` menerima string kosong saja dan menghasilkan satu state penerima tanpa transisi. `\E` menerima huruf `E` saja.
- Minimisasi: `(a|b)*abb(a|b)*` menghasilkan 6 state pada konstruksi langsung dan 4 state pada DFA minimum, dengan bahasa yang sama untuk semua string pendek. DFA minimum tidak memiliki dua state yang bisa dibedakan.

## Keputusan yang sudah diambil

- **Minimisasi DFA:** tersedia sebagai fitur. Tabel, diagram, dan simulator dapat berpindah antara DFA hasil konstruksi langsung dan DFA minimum. Bukti minimalitas diuji lewat pencarian string pembeda untuk setiap pasangan state.
- **Epsilon:** memakai huruf `E` untuk string kosong. Huruf E biasa ditulis `\E`.
- **Escape:** garis miring meneruskan karakter apa pun sebagai simbol literal (`\*`, `\|`, `\(`, `\)`, `\#`, `\•`, `\.`). Karakter `#` tanpa escape tetap ditolak karena dipakai sebagai penanda akhir.
- **Konkatenasi eksplisit:** tanda `•` dan titik `.` diterima langsung di input sebagai operator konkatenasi.

## Teknologi

HTML, CSS, dan JavaScript murni tanpa dependensi maupun proses build. Logika konversi berada di `src/engine.js` (tanpa DOM) dan tampilan di `src/app.js`. Uji memakai `node:test`.

## Arah visual

Mengikuti token `Design/design.md` (kanvas hangat, aksen terracotta, elevasi flat), dengan penyimpangan yang dicatat di komentar `styles.css`: beberapa nilai teks digelapkan agar lolos WCAG AA. Mode terang dan gelap sama-sama tersedia.

## Verifikasi

Cara menjalankan:
```bash
cd D:/Raid/Coding/Project/RE-to-DFA
npx serve .          # lalu buka http://localhost:3000
npm test             # menjalankan seluruh uji node:test
```

Berkas `index.html` memuat modul ES, jadi harus dibuka lewat server lokal, bukan `file://`.

Yang diuji otomatis:

- 60 tes di `tests/`, termasuk ekuivalensi terhadap regex acuan untuk semua string pendek, pembuktian minimalitas lewat string pembeda antar pasangan state, escape, dan epsilon.
- Perilaku tampilan diperiksa langsung di browser: konsol tanpa error, tidak ada elemen keluar `viewBox`, tidak ada teks keluar kotak, kontras AA terpenuhi di kedua tema, tap target minimal 44px di 390px, tidak ada overflow halaman, dan fokus keyboard pada 28 elemen.

## Batas yang diketahui

- Konversi dibatasi 512 state untuk mencegah pembekuan halaman pada ekspresi besar.
- Jejak partisi minimisasi menampilkan kelompok state per putaran; diagram belum menggambar ulang tiap putaran.

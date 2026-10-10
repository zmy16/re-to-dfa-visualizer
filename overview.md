# Architecture & Technical Overview: RE to DFA Visualizer

## 1. Project Context & Objectives
Aplikasi **RE to DFA Visualizer** adalah alat interaktif berbasis web yang dirancang untuk membantu mahasiswa, dosen, dan praktisi Computer Science memahami proses konversi **Regular Expression (RE)** menjadi **Deterministic Finite Automaton (DFA)**. 

Konversi ini menggunakan metode **Direct Construction via Syntax Tree** dan perhitungan **$followpos$**, menghindari jalur NFA perantara (seperti Algoritma Thompson) agar menghasilkan DFA minimum/langsung.

---

## 2. Theoretical Foundations & Rules

### 2.1 Augmented Regular Expression
Sebelum diproses, ekspresi reguler $r$ ditransformasikan menjadi bentuk augmented $r'$:
1. **Explicit Concatenation ($\cdot$):** Menyisipkan operator titik secara eksplisit pada pasangan simbol berurutan (misal: `ab` $\rightarrow$ `a•b`, `a(b)` $\rightarrow$ `a•(b)`, `a*b` $\rightarrow$ `a*•b`).
2. **Augmentation Penanda Endmark ($\#$):** Menambahkan karakter unik penanda garis finish di akhir ekspresi:
   $$ r' = (r) \cdot \# $$

### 2.2 Aturan $nullable$, $firstpos$, dan $lastpos$

Pohon Sintaks (*Abstract Syntax Tree*) diisi secara *bottom-up* (post-order traversal) mengikuti aturan standar:

| Node $n$ | $nullable(n)$ | $firstpos(n)$ | $lastpos(n)$ |
| :--- | :--- | :--- | :--- |
| **Daun / Leaf** (posisi $i$) | $\text{false}$ | $\{i\}$ | $\{i\}$ |
| **Or** ($c_1 \mid c_2$) | $nullable(c_1) \lor nullable(c_2)$ | $firstpos(c_1) \cup firstpos(c_2)$ | $lastpos(c_1) \cup lastpos(c_2)$ |
| **Cat** ($c_1 \cdot c_2$) | $nullable(c_1) \land nullable(c_2)$ | $nullable(c_1) ? (firstpos(c_1) \cup firstpos(c_2)) : firstpos(c_1)$ | $nullable(c_2) ? (lastpos(c_1) \cup lastpos(c_2)) : lastpos(c_2)$ |
| **Star** ($c^*$) | $\text{true}$ | $firstpos(c)$ | $lastpos(c)$ |

---

### 2.3 Aturan Perhitungan $followpos$

Perhitungan $followpos(i)$ untuk setiap posisi daun $i$ ditentukan hanya oleh dua jenis node dalam pohon sintaks:

1. **Aturan Node Concatenation ($c_1 \cdot c_2$):**
   * Untuk setiap posisi $i \in lastpos(c_1)$, tambahkan seluruh himpunan $firstpos(c_2)$ ke dalam $followpos(i)$.
   * *Logika:* Setelah membaca bagian akhir anak kiri, karakter berikutnya yang boleh dibaca adalah bagian awal anak kanan.

2. **Aturan Node Kleene Star ($c^*$):**
   * Untuk setiap posisi $i \in lastpos(c)$, tambahkan seluruh himpunan $firstpos(c)$ ke dalam $followpos(i)$.
   * *Logika:* Setelah selesai membaca siklus perulangan, karakter berikutnya bisa memutar balik ke awal perulangan itu sendiri.

---

### 2.4 Subset Construction (DFA Builder)
1. **State Awal:** $A = firstpos(\text{Root})$. Tandai State $A$ sebagai *unmarked*.
2. **Alfabet Input ($\Sigma$):** Semua karakter unik yang muncul pada daun pohon (kecuali penanda finish $\#$).
3. **Pencarian State Baru:**
   * Untuk setiap state $S$ yang *unmarked*:
     * Untuk setiap simbol $a \in \Sigma$:
       * Hitung $U = \bigcup followpos(p)$ untuk semua posisi $p \in S$ yang memuat karakter $a$.
       * Jika $U \neq \emptyset$:
         * Tambahkan transisi: $\text{DFA}[S][a] = U$.
         * Jika $U$ belum ada dalam daftar state DFA, daftarkan $U$ sebagai state baru dan set sebagai *unmarked*.
4. **Accepting State:** Semua state DFA yang anggotanya mengandung posisi dari karakter penanda akhir $\#$.

---

## 3. Data Structures & Models

### 3.1 `SyntaxTreeNode`
```typescript
interface SyntaxTreeNode {
  id: string;
  type: 'leaf' | 'cat' | 'or' | 'star';
  value: string;             // 'a', 'b', '0', '1', '•', '|', '*', '#'
  position?: number;         // Angka posisi 1..N (hanya untuk leaf)
  nullable: boolean;
  firstpos: Set<number>;
  lastpos: Set<number>;
  children: SyntaxTreeNode[];
}
```

### 3.2 `FollowposEntry`
```typescript
interface FollowposEntry {
  position: number;
  symbol: string;
  followpos: Set<number>;
  ruleExplanation: string;
}
```

### 3.3 `DFAStateGraph`
```typescript
interface DFAState {
  id: string;               // Label State: 'S0', 'S1', 'S2'...
  positions: Set<number>;   // Himpunan posisi (misal: {1, 3, 5})
  isStart: boolean;
  isAccept: boolean;
}

interface DFATransition {
  from: string;             // State ID
  symbol: string;           // Input character ('0', '1', 'a', 'b')
  to: string;               // Target State ID
}
```

---

## 4. Pipeline Execution Workflow

```
[User Input RE] 
       │
       ▼
[1. Preprocessing & Explicit Concatenation] 
       │
       ▼
[2. AST Generation (Shunting-Yard / Parser)]
       │
       ▼
[3. Bottom-Up Evaluation (firstpos, lastpos, nullable)]
       │
       ▼
[4. Traversal AST for Followpos Table]
       │
       ▼
[5. Subset Construction for DFA Table]
       │
       ▼
[6. SVG Graph Rendering & Interactive Simulator]
```

---

## 5. Module UI Architecture

Aplikasi ini mengusung antarmuka tunggal (*single-page layout*) yang responsif dan terbagi menjadi 5 modul utama:

1. **Input Bar & Preset Selection:**
   * Mendukung alfabet bebas (angka `0, 1`, huruf `a, b, c`, maupun simbol khusus).
   * Tombol preset siap pakai untuk skenario tes sederhana hingga kompleks.
2. **Abstract Syntax Tree (AST) View:**
   * Visualisasi pohon hierarki berbasis SVG.
   * Anotasi angka $firstpos$, $lastpos$, dan $nullable$ pada tiap node.
3. **Followpos Table View:**
   * Tabel yang interaktif; saat sebuah baris diklik, node/posisi terkait pada pohon akan tersorot.
4. **DFA Transition Table:**
   * Tabel transisi yang menyajikan himpunan posisi asal, simbol input, dan state tujuan.
5. **Interactive State Diagram & String Simulator:**
   * Visualisasi graf berarah (*State Machine Diagram*).
   * Fitur pengujian string (*real-time step-by-step simulator*) dengan penelusuran status **Accepted** atau **Rejected**.
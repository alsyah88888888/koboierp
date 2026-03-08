# SOP Penugasan Akses Pengguna - ERP Kola Borasi

Dokumen ini menjelaskan tanggung jawab dan prosedur standar operasional (SOP) bagi setiap peran (role) yang terdaftar dalam sistem ERP Kola Borasi.

---

## 1. Administrasi (Role: ADMIN)
**Tujuan**: Mengelola keseluruhan sistem, memastikan integritas data, dan mengatur konfigurasi global.

**Tanggung Jawab Utama**:
- **Manajemen Pengguna**: Menambah, menghapus, atau mengubah hak akses pengguna.
- **Konfigurasi Sistem**: Mengatur pengaturan global di menu *Settings*.
- **Audit Data**: Memantau seluruh transaksi di dashboard *Overview* untuk memastikan tidak ada anomali.
- **Master Data**: Memiliki wewenang penuh untuk menambah/mengubah data Produk, Supplier, dan Buyer (Customer).

**Alur Kerja**:
1. Memeriksa metrik kesehatan finansial di dashboard utama setiap pagi.
2. Memverifikasi pengajuan pembelian yang memerlukan persetujuan tingkat tinggi.
3. Melakukan pembersihan data jika terjadi kesalahan input yang tidak bisa diperbaiki oleh role lain.

---

## 2. Keuangan & Akuntansi (Role: FINANCE)
**Tujuan**: Mengelola arus kas, memverifikasi pembayaran, dan menyusun laporan keuangan.

**Tanggung Jawab Utama**:
- **Verifikasi Pembelian**: Memeriksa dan memverifikasi pengajuan pembelian yang masuk.
- **Manajemen Kas**: Mengelola saldo Bank dan Kas Kecil.
- **Biaya Operasional**: Mencatat dan memantau pengeluaran operasional perusahaan.
- **Laporan Akuntansi**: Memeriksa jurnal umum dan buku besar untuk memastikan rekonsiliasi yang tepat.

**Alur Kerja**:
1. Membuka menu *Keuangan* untuk melihat jatuh tempo Hutang dan Piutang.
2. Memverifikasi status pembayaran (LUNAS) pada transaksi pembelian yang sudah diselesaikan.
3. Mencatat biaya harian di menu *Operasional*.
4. Meninjau laporan laba rugi di menu *Akuntansi* secara berkala.

---

## 3. Pembelian (Role: PURCHASE)
**Tujuan**: Memastikan ketersediaan stok barang melalui pengadaan yang efisien dari supplier.

**Tanggung Jawab Utama**:
- **Pengadaan Barang**: Membuat dan mengirim pengajuan pembelian kepada Admin/Finance.
- **Manajemen Supplier**: Mengelola daftar supplier dan harga penawaran.
- **Pengawasan Stok**: Memantau tingkat stok minimal agar tidak terjadi kekosongan.
- **Master Data**: Input data barang baru dan supplier baru ke dalam sistem.

**Alur Kerja**:
1. Mengecek daftar stok di menu *Gudang* atau Dashboard.
2. Membuat pengajuan di menu *Pengajuan Pembelian* jika stok berada di bawah batas minimal.
3. Berkoordinasi dengan Finance terkait pembayaran invoice dari supplier.

---

## 4. Penjualan (Role: SALES)
**Tujuan**: Meningkatkan volume penjualan dan menjaga hubungan baik dengan customer.

**Tanggung Jawab Utama**:
- **Proses Order**: Menginput transaksi penjualan dan pengiriman barang (Surat Jalan/Invoice).
- **Manajemen Buyer**: Mencatat data customer baru dan memantau riwayat pembelian mereka.
- **Monitoring Pengiriman**: Memastikan barang sampai ke konsumen sesuai jadwal.

**Alur Kerja**:
1. Menerima pesanan dari customer dan mengecek ketersediaan stok di menu *Penjualan*.
2. Membuat Surat Jalan (SJ) dan Invoice melalui sistem.
3. Memantau status "Alamat Kirim" untuk memastikan akurasi pengiriman.

---

## 5. Logistik & Gudang (Role: WAREHOUSE)
**Tujuan**: Menjaga akurasi fisik stok barang dan efisiensi operasional gudang.

**Tanggung Jawab Utama**:
- **Penerimaan Barang**: Memverifikasi barang yang datang dari supplier di menu *Checker*.
- **Manajemen Lokasi**: Mengatur penempatan barang di berbagai gudang yang tersedia.
- **Stock Opname**: Melakukan pengecekan fisik barang secara berkala untuk disesuaikan dengan sistem.

**Alur Kerja**:
1. Membuka menu *Gudang (Checker)* setiap ada barang masuk.
2. Memverifikasi jumlah dan kondisi barang sebelum memasukkannya ke sistem stok.
3. Memantau *Recent Activity* untuk melihat pergerakan barang masuk dan keluar.

---

## Prinsip Keamanan & Akuntabilitas
1. **Dilarang Berbagi Akun**: Setiap pengguna wajib menggunakan akun masing-masing.
2. **Kerahasiaan Data**: Data finansial dan data customer bersifat rahasia perusahaan.
3. **Log Transaksi**: Setiap tindakan (tambah/edit/hapus) terekam oleh sistem dengan identitas pengguna yang bersangkutan.

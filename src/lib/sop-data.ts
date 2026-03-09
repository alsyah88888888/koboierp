export const ROLE_SOP = {
    ADMIN: {
        title: "Administrator Utama",
        goal: "Mengelola keseluruhan ekosistem ERP, konfigurasi sistem, dan audit data global.",
        responsibilities: [
            "Manajemen hak akses dan akun pengguna",
            "Konfigurasi pengaturan global perusahaan",
            "Penyelesaian anomali data transaksi",
            "Audit laporan keuangan dan operasional harian"
        ],
        workflow: "Cek kesehatan finansial pagi hari, verifikasi pengajuan kritis, dan audit log sistem."
    },
    FINANCE: {
        title: "Bagian Keuangan & Akuntansi",
        goal: "Menjamin akurasi arus kas, verifikasi pengeluaran, dan validitas laporan akuntansi.",
        responsibilities: [
            "Verifikasi pengajuan pembelian dan pembayaran supplier",
            "Pencatatan biaya operasional dan pengeluaran harian",
            "Rekonsiliasi saldo bank dan kas kecil",
            "Penyusunan laporan laba rugi dan neraca"
        ],
        workflow: "Pantau jatuh tempo hutang/piutang, verifikasi pelunasan, dan tutup buku harian."
    },
    PURCHASE: {
        title: "Bagian Pengadaan (Purchasing)",
        goal: "Memastikan ketersediaan stok melalui pengadaan material yang efisien dan tepat waktu.",
        responsibilities: [
            "Pembuatan pengajuan pembelian (Request/PO)",
            "Manajemen hubungan dan negosiasi supplier",
            "Pemantauan ambang batas stok minimal (Low Stock)",
            "Input data master produk dan supplier baru"
        ],
        workflow: "Cek peringatan stok rendah, buat pengajuan pembelian, dan pantau kedatangan barang."
    },
    SALES: {
        title: "Bagian Penjualan (Sales)",
        goal: "Optimasi volume penjualan, pelayanan buyer, dan akurasi dokumen administrasi penjualan.",
        responsibilities: [
            "Input transaksi penjualan dan pembuatan Surat Jalan",
            "Manajemen data buyer dan riwayat piutang",
            "Koordinasi pengiriman barang ke alamat tujuan",
            "Monitoring performa penjualan individu dan tim"
        ],
        workflow: "Proses pesanan masuk, buat invoice/SJ, dan update status pengiriman ke buyer."
    },
    WAREHOUSE: {
        title: "Manajemen Gudang & Logistik",
        goal: "Menjaga integritas stok fisik, efisiensi gudang, dan akurasi penerimaan barang.",
        responsibilities: [
            "Verifikasi barang masuk dari supplier (Checker)",
            "Manajemen lokasi penyimpanan dan pergerakan stok",
            "Pelaksanaan stock opname secara berkala",
            "Laporan kerusakan atau ketidaksesuaian barang"
        ],
        workflow: "Checker barang datang, update stok masuk, dan audit pergerakan barang harian."
    }
};

export type RoleType = keyof typeof ROLE_SOP;

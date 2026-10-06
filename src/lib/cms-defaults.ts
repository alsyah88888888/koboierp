export interface CmsStep {
    stepNumber?: number;
    title: string;
    desc: string;
    linkUrl?: string;
    linkText?: string;
    icon?: string;
}

export interface CmsItem {
    id: string;
    title: string;
    category: "FLOW_KEGIATAN" | "JADWAL_PENGIRIMAN" | "PENGUMUMAN" | "SOP";
    summary?: string | null;
    content: string;
    steps?: string | null; // JSON encoded CmsStep[]
    parsedSteps?: CmsStep[];
    linkUrl?: string | null;
    linkText?: string | null;
    badge?: string | null;
    colorTheme?: string | null; // "indigo" | "blue" | "emerald" | "amber" | "purple" | "rose"
    icon?: string | null;
    priority: number;
    isPinned: boolean;
    isActive: boolean;
    targetRole?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

export const DEFAULT_CMS_ITEMS: CmsItem[] = [
    {
        id: "default-flow-pengiriman",
        title: "Alur Pemuatan & Jadwal Pengiriman Truk (Loading Dock)",
        category: "FLOW_KEGIATAN",
        summary: "Proses lengkap dari pesanan siap muat di lantai gudang, validasi armada fisik, cetak form manifest, hingga keberangkatan.",
        content: "Seluruh tim gudang dan sopir wajib mematuhi alur pemuatan barang ke kendaraan. Pemeriksaan fisik dilakukan bersama Checker Gudang sebelum kendaraan meninggalkan pintu muat.",
        steps: JSON.stringify([
            {
                stepNumber: 1,
                title: "1. Tentukan Armada & Sopir",
                desc: "Pilih salah satu dari 5 armada resmi (Karno, Kuswara, Rahmat, Carsika, Heru) atau Ekspedisi / Ambil Sendiri.",
                linkUrl: "/warehouse/jadwal-pengiriman",
                linkText: "Pilih Armada"
            },
            {
                stepNumber: 2,
                title: "2. Centang Muatan Gudang",
                desc: "Pilih faktur/pesanan yang antri di lantai gudang untuk dimuat ke dalam mobil terpilih.",
                linkUrl: "/warehouse/jadwal-pengiriman",
                linkText: "Pilih Pesanan"
            },
            {
                stepNumber: 3,
                title: "3. Verifikasi Fisik Bersama",
                desc: "Checker gudang dan sopir menghitung fisik kuantiti per produk sebelum barang dinaikkan ke bak truk.",
                linkUrl: "/warehouse/jadwal-pengiriman",
                linkText: "Cek Fisik"
            },
            {
                stepNumber: 4,
                title: "4. Cetak Form Surat Muatan A4",
                desc: "Cetak Surat Muatan Kendaraan (Loading Manifest) A4 untuk ditandatangani 3 pihak (Checker, Sopir, Kepala Gudang).",
                linkUrl: "/warehouse/jadwal-pengiriman",
                linkText: "Cetak Manifest"
            },
            {
                stepNumber: 5,
                title: "5. Penerbitan Surat Jalan (SJ)",
                desc: "Surat Jalan resmi otomatis terupdate dengan nomor armada dan siap dibawa sopir menuju lokasi customer.",
                linkUrl: "/delivery",
                linkText: "Lihat Surat Jalan"
            }
        ]),
        linkUrl: "/warehouse/jadwal-pengiriman",
        linkText: "Buka Loading Dock Gudang",
        badge: "LOGISTIK & DISTRIBUSI",
        colorTheme: "indigo",
        icon: "Truck",
        priority: 100,
        isPinned: true,
        isActive: true,
        targetRole: "ALL"
    },
    {
        id: "default-jadwal-armada",
        title: "Jadwal Armada Resmi & Kartu E-Toll Siap Operasional",
        category: "JADWAL_PENGIRIMAN",
        summary: "Daftar 5 armada resmi PT Kola Borasi Indonesia beserta nomor polisi dan nomor kartu E-Toll kantor yang berlaku.",
        content: "Setiap sopir wajib membawa kartu E-Toll resmi kantor yang telah ditentukan dan mengembalikan kartu setelah selesai pengiriman.",
        steps: JSON.stringify([
            {
                stepNumber: 1,
                title: "🚚 KARNO (Armada 1)",
                desc: "No. Polisi: F 8840 GY • Kartu E-Toll: 0145 0084 0251 7303",
                linkUrl: "/warehouse/jadwal-pengiriman",
                linkText: "Jadwal Karno"
            },
            {
                stepNumber: 2,
                title: "🚚 KUSWARA (Armada 2)",
                desc: "No. Polisi: B 9198 FCM • Kartu E-Toll: 0145 0084 0251 7261",
                linkUrl: "/warehouse/jadwal-pengiriman",
                linkText: "Jadwal Kuswara"
            },
            {
                stepNumber: 3,
                title: "🚚 RAHMAT. H (Armada 3)",
                desc: "No. Polisi: F 8744 MA • Kartu E-Toll: 0145 0084 0251 7279",
                linkUrl: "/warehouse/jadwal-pengiriman",
                linkText: "Jadwal Rahmat"
            },
            {
                stepNumber: 4,
                title: "🚚 CARSIKA (Armada 4)",
                desc: "No. Polisi: F 8065 HI • Kartu E-Toll: 0145 0084 0251 7287",
                linkUrl: "/warehouse/jadwal-pengiriman",
                linkText: "Jadwal Carsika"
            },
            {
                stepNumber: 5,
                title: "🚚 HERU (Armada 5)",
                desc: "No. Polisi: B 9918 TIT • Kartu E-Toll: 0145 0084 0251 7295",
                linkUrl: "/warehouse/jadwal-pengiriman",
                linkText: "Jadwal Heru"
            }
        ]),
        linkUrl: "/warehouse/jadwal-pengiriman",
        linkText: "Pantau Armada Selesai Dimuat",
        badge: "ARMADA RESMI",
        colorTheme: "blue",
        icon: "Calendar",
        priority: 90,
        isPinned: false,
        isActive: true,
        targetRole: "ALL"
    },
    {
        id: "default-flow-penerimaan",
        title: "Alur Penerimaan Barang Masuk (Purchase to Stock / LPB)",
        category: "FLOW_KEGIATAN",
        summary: "Tahapan dari pengajuan pembelian (PR), Purchase Order (PO), penerimaan fisik gudang (LPB), hingga pencatatan stok.",
        content: "Barang masuk dari supplier harus dicocokkan dengan dokumen PO, diperiksa kondisi fisik dan tanggal kedaluwarsa sebelum dimasukkan ke rak penyimpanan.",
        steps: JSON.stringify([
            {
                stepNumber: 1,
                title: "1. Purchase Request (PR)",
                desc: "Divisi terkait mengajukan permintaan barang melalui menu Pengajuan.",
                linkUrl: "/operational",
                linkText: "Menu Pengajuan"
            },
            {
                stepNumber: 2,
                title: "2. Penerbitan PO Resmi",
                desc: "Admin Purchasing menerbitkan Purchase Order (PO) resmi ke supplier.",
                linkUrl: "/purchase",
                linkText: "Menu Pembelian"
            },
            {
                stepNumber: 3,
                title: "3. Penerimaan Fisik (LPB)",
                desc: "Gudang menerima fisik barang dari supplier dan menerbitkan Laporan Penerimaan Barang (LPB).",
                linkUrl: "/warehouse",
                linkText: "Menu Gudang"
            },
            {
                stepNumber: 4,
                title: "4. Verifikasi Finance & Stok",
                desc: "Finance memverifikasi dokumen tagihan (AP) dan stok inventori otomatis bertambah.",
                linkUrl: "/finance",
                linkText: "Menu Keuangan"
            }
        ]),
        linkUrl: "/purchase",
        linkText: "Buka Data Pembelian",
        badge: "PENGADAAN & STOK",
        colorTheme: "emerald",
        icon: "Package",
        priority: 80,
        isPinned: false,
        isActive: true,
        targetRole: "ALL"
    },
    {
        id: "default-sop-retur",
        title: "SOP Penanganan Barang Ditolak & Retur Penjualan",
        category: "SOP",
        summary: "Prosedur penanganan ketika ada barang yang ditolak oleh toko/customer di lokasi pengiriman.",
        content: "Jika ada barang penolakan, sopir mencatat Qty riil pada Surat Jalan fisik dengan tanda tangan toko, lalu Admin Penjualan menginput Retur Penjualan di sistem.",
        steps: JSON.stringify([
            {
                stepNumber: 1,
                title: "1. Catat Surat Jalan Fisik di Lapangan",
                desc: "Sopir menuliskan kuantiti yang diterima vs ditolak dan meminta tanda tangan & cap stempel toko penerima.",
                linkUrl: "/delivery",
                linkText: "Cek Surat Jalan"
            },
            {
                stepNumber: 2,
                title: "2. Input Dokumen Retur Penjualan",
                desc: "Admin Sales menginput data retur di menu Penjualan -> Retur Penjualan berdasarkan nomor Surat Jalan.",
                linkUrl: "/sales",
                linkText: "Input Retur"
            },
            {
                stepNumber: 3,
                title: "3. Penerimaan Fisik di Gudang",
                desc: "Fisik barang yang dibawa pulang sopir diperiksa oleh kepala gudang dan stok bertambah kembali.",
                linkUrl: "/warehouse",
                linkText: "Cek Stok Gudang"
            },
            {
                stepNumber: 4,
                title: "4. Penyesuaian Piutang (Credit Memo)",
                desc: "Finance memverifikasi retur sehingga piutang toko otomatis berkurang sesuai barang yang riil diterima.",
                linkUrl: "/finance",
                linkText: "Verifikasi Finance"
            }
        ]),
        linkUrl: "/sales",
        linkText: "Buka Modul Penjualan",
        badge: "SOP OPERASIONAL",
        colorTheme: "amber",
        icon: "AlertCircle",
        priority: 70,
        isPinned: false,
        isActive: true,
        targetRole: "ALL"
    }
];

export function parseCmsSteps(stepsJson?: string | null): CmsStep[] {
    if (!stepsJson) return [];
    try {
        const parsed = JSON.parse(stepsJson);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

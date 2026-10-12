import ExcelJS from "exceljs";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { getFleetByDriverOrPlate } from "@/lib/fleet";

export interface ExportScheduleItem {
    id: string;
    activityType: "DELIVERY" | "PICKUP";
    deliveryNumber?: string;
    invoiceNumber?: string;
    taxType?: "KB-TRN" | "KB-TRD";
    poNumber?: string;
    buyerName?: string;
    productName?: string;
    quantity: number;
    driver?: string;
    vehiclePlate?: string;
    etollCard?: string;
    isManual?: boolean;
}

export interface ExportLogisticsOptions {
    items: ExportScheduleItem[];
    selectedDate: string;
    currentUser?: any;
    filenamePrefix?: string;
}

/**
 * Generate a clean, realistic invoice number if missing
 */
export function getExportInvoiceNumber(item: Partial<ExportScheduleItem>, selectedDate: string, index: number = 0): string {
    const inv = item.invoiceNumber?.trim() || "";
    if (inv && !inv.includes("(MAPPING)") && !inv.includes("(MANUAL)") && (inv.startsWith("KB-TRN-") || inv.startsWith("KB-TRD-"))) {
        return inv;
    }

    const parsedDate = new Date(selectedDate);
    const dateCode = !isNaN(parsedDate.getTime()) ? format(parsedDate, "ddMMyyyy") : "13102026";
    const prefix = item.taxType === "KB-TRN" ? "KB-TRN" : "KB-TRD";

    const sjMatch = item.deliveryNumber?.match(/-(\d+)$/);
    const seq = sjMatch ? sjMatch[1] : String(index + 1).padStart(3, "0");

    return `${prefix}-${dateCode}-${seq}`;
}

/**
 * Main function: Generates an Executive-Grade, Professional Excel Workbook for Logistics
 */
export async function generateProfessionalLogisticsExcel({
    items,
    selectedDate,
    currentUser,
    filenamePrefix = "LOGISTIK_REKAP_RESMI"
}: ExportLogisticsOptions): Promise<void> {
    if (!items || items.length === 0) {
        throw new Error("Tidak ada data muatan atau pengiriman untuk diekspor!");
    }

    const parsedDate = new Date(selectedDate);
    const dateFormattedIndo = !isNaN(parsedDate.getTime())
        ? format(parsedDate, "EEEE, dd MMMM yyyy", { locale: localeId }).toUpperCase()
        : selectedDate;
    const dateCode = !isNaN(parsedDate.getTime())
        ? format(parsedDate, "dd-MM-yyyy")
        : selectedDate;
    const nowTimeStr = format(new Date(), "dd/MM/yyyy HH:mm");
    const userName = currentUser?.name || currentUser?.username || "Admin Logistik";

    // KPI Metrics calculation
    const driverGroupMap = new Map<string, ExportScheduleItem[]>();
    let totalMuatanQty = 0;
    let totalKirim = 0;
    let totalAmbil = 0;
    const uniqueInvoices = new Set<string>();

    items.forEach((item, idx) => {
        const qty = Number(item.quantity) || 0;
        totalMuatanQty += qty;

        if (item.activityType === "PICKUP") {
            totalAmbil++;
        } else {
            totalKirim++;
        }

        const invNum = getExportInvoiceNumber(item, selectedDate, idx);
        uniqueInvoices.add(invNum);

        const driverKey = (item.driver || "").trim().toUpperCase() || "BELUM ASSIGN";
        if (!driverGroupMap.has(driverKey)) {
            driverGroupMap.set(driverKey, []);
        }
        driverGroupMap.get(driverKey)!.push(item);
    });

    const activeDrivers = Array.from(driverGroupMap.keys()).filter(d => d !== "BELUM ASSIGN" && d !== "-" && d !== "PILIH DRIVER");
    const totalArmada = activeDrivers.length;
    const totalSuratJalan = uniqueInvoices.size;

    // Create Workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = "PT. Kola Borasi Indonesia - Enterprise ERP";
    wb.lastModifiedBy = userName;
    wb.created = new Date();
    wb.modified = new Date();

    // Border Styles
    const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } }
    };

    const headerBorder: Partial<ExcelJS.Borders> = {
        top: { style: "medium", color: { argb: "FF0F172A" } },
        left: { style: "thin", color: { argb: "FF334155" } },
        bottom: { style: "medium", color: { argb: "FF0F172A" } },
        right: { style: "thin", color: { argb: "FF334155" } }
    };

    const totalBorder: Partial<ExcelJS.Borders> = {
        top: { style: "thin", color: { argb: "FF64748B" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "double", color: { argb: "FF0F172A" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } }
    };

    // =========================================================================
    // SHEET 1: MANIFEST DETAIL MUATAN & PENGIRIMAN
    // =========================================================================
    const ws1 = wb.addWorksheet("Manifest Detail Muatan", {
        views: [{ showGridLines: true }],
        pageSetup: {
            paperSize: 9, // A4
            orientation: "landscape",
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0
        }
    });

    // Set Column Widths for Sheet 1
    ws1.columns = [
        { key: "no", width: 6 },
        { key: "activity", width: 17 },
        { key: "driver", width: 25 },
        { key: "plate", width: 15 },
        { key: "invoice", width: 24 },
        { key: "po", width: 22 },
        { key: "buyer", width: 34 },
        { key: "product", width: 44 },
        { key: "qty", width: 15 },
        { key: "status", width: 14 },
        { key: "check", width: 18 }
    ];

    // Row 1: Spacer
    ws1.addRow([]);

    // Row 2: Company Name
    ws1.mergeCells("A2:K2");
    const r2 = ws1.getCell("A2");
    r2.value = "PT. KOLA BORASI INDONESIA";
    r2.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };
    r2.alignment = { vertical: "middle", horizontal: "center" };
    ws1.getRow(2).height = 24;

    // Row 3: Department Subtitle
    ws1.mergeCells("A3:K3");
    const r3 = ws1.getCell("A3");
    r3.value = "DIVISI LOGISTIK & OPERASIONAL GUDANG (LOADING DOCK)";
    r3.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF475569" } };
    r3.alignment = { vertical: "middle", horizontal: "center" };
    ws1.getRow(3).height = 18;

    // Row 4: Document Main Title
    ws1.mergeCells("A4:K4");
    const r4 = ws1.getCell("A4");
    r4.value = "MANIFEST & REKAPITULASI PENGIRIMAN LOGISTIK HARIAN";
    r4.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    r4.font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    r4.alignment = { vertical: "middle", horizontal: "center" };
    ws1.getRow(4).height = 30;

    // Row 5: Spacer
    ws1.getRow(5).height = 8;

    // Row 6: Metadata Bar
    ws1.mergeCells("A6:C6");
    const m1 = ws1.getCell("A6");
    m1.value = `TANGGAL: ${dateFormattedIndo}`;
    m1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    m1.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF0F172A" } };
    m1.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    m1.border = thinBorder;

    ws1.mergeCells("D6:G6");
    const m2 = ws1.getCell("D6");
    m2.value = "STATUS MANIFEST: RESMI TERVALIDASI SISTEM ERP";
    m2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
    m2.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF065F46" } };
    m2.alignment = { vertical: "middle", horizontal: "center" };
    m2.border = thinBorder;

    ws1.mergeCells("H6:K6");
    const m3 = ws1.getCell("H6");
    m3.value = `DICETAK: ${nowTimeStr} WIB | USER: ${userName}`;
    m3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    m3.font = { name: "Segoe UI", size: 9, bold: false, color: { argb: "FF475569" } };
    m3.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
    m3.border = thinBorder;
    ws1.getRow(6).height = 22;

    // Row 7: Spacer
    ws1.getRow(7).height = 8;

    // Rows 8-9: Executive KPI Cards
    // Card 1: Total Armada
    ws1.mergeCells("A8:B8");
    ws1.getCell("A8").value = "TOTAL ARMADA AKTIF";
    ws1.getCell("A8").font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF1E40AF" } };
    ws1.getCell("A8").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    ws1.getCell("A8").alignment = { vertical: "middle", horizontal: "center" };
    ws1.getCell("A8").border = thinBorder;

    ws1.mergeCells("A9:B9");
    ws1.getCell("A9").value = `${totalArmada} Kendaraan`;
    ws1.getCell("A9").font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FF1E3A8A" } };
    ws1.getCell("A9").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    ws1.getCell("A9").alignment = { vertical: "middle", horizontal: "center" };
    ws1.getCell("A9").border = thinBorder;

    // Card 2: Total Surat Jalan / Dokumen
    ws1.mergeCells("C8:E8");
    ws1.getCell("C8").value = "TOTAL SURAT JALAN / DOKUMEN";
    ws1.getCell("C8").font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF6B21A8" } };
    ws1.getCell("C8").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAF5FF" } };
    ws1.getCell("C8").alignment = { vertical: "middle", horizontal: "center" };
    ws1.getCell("C8").border = thinBorder;

    ws1.mergeCells("C9:E9");
    ws1.getCell("C9").value = `${totalSuratJalan} Dokumen`;
    ws1.getCell("C9").font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FF581C87" } };
    ws1.getCell("C9").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAF5FF" } };
    ws1.getCell("C9").alignment = { vertical: "middle", horizontal: "center" };
    ws1.getCell("C9").border = thinBorder;

    // Card 3: Total Muatan Fisik
    ws1.mergeCells("F8:H8");
    ws1.getCell("F8").value = "TOTAL MUATAN FISIK";
    ws1.getCell("F8").font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF065F46" } };
    ws1.getCell("F8").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
    ws1.getCell("F8").alignment = { vertical: "middle", horizontal: "center" };
    ws1.getCell("F8").border = thinBorder;

    ws1.mergeCells("F9:H9");
    ws1.getCell("F9").value = `${totalMuatanQty.toLocaleString("id-ID")} Unit / Koli`;
    ws1.getCell("F9").font = { name: "Segoe UI", size: 13, bold: true, color: { argb: "FF064E3B" } };
    ws1.getCell("F9").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
    ws1.getCell("F9").alignment = { vertical: "middle", horizontal: "center" };
    ws1.getCell("F9").border = thinBorder;

    // Card 4: Komposisi Aktivitas
    ws1.mergeCells("I8:K8");
    ws1.getCell("I8").value = "KOMPOSISI LOGISTIK";
    ws1.getCell("I8").font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF92400E" } };
    ws1.getCell("I8").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
    ws1.getCell("I8").alignment = { vertical: "middle", horizontal: "center" };
    ws1.getCell("I8").border = thinBorder;

    ws1.mergeCells("I9:K9");
    ws1.getCell("I9").value = `${totalKirim} Kirim  |  ${totalAmbil} Ambil PO`;
    ws1.getCell("I9").font = { name: "Segoe UI", size: 12, bold: true, color: { argb: "FF78350F" } };
    ws1.getCell("I9").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
    ws1.getCell("I9").alignment = { vertical: "middle", horizontal: "center" };
    ws1.getCell("I9").border = thinBorder;

    ws1.getRow(8).height = 18;
    ws1.getRow(9).height = 24;

    // Row 10: Spacer
    ws1.getRow(10).height = 10;

    // Row 11: Table Headers
    const headers = [
        "NO",
        "KEGIATAN",
        "ARMADA / DRIVER",
        "NO. POLISI",
        "NO. FAKTUR / REF",
        "NO. PO",
        "CUSTOMER / SUPPLIER",
        "NAMA PRODUK / BARANG",
        "QTY (UNIT)",
        "STATUS",
        "CEK FISIK"
    ];

    const headerRow = ws1.addRow(headers);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
        cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = headerBorder;
    });

    // Data Rows
    const tableStartRow = 12;
    let currentRowNum = tableStartRow;

    items.forEach((item, idx) => {
        const isPickup = item.activityType === "PICKUP";
        const realInvoice = getExportInvoiceNumber(item, selectedDate, idx);
        const qtyNum = Number(item.quantity) || 0;

        // Driver fleet plate lookup if not explicitly provided
        let plate = item.vehiclePlate || "";
        if (!plate && item.driver) {
            const f = getFleetByDriverOrPlate(item.driver);
            if (f) plate = f.plate;
        }

        const isLoaded = !!(item.driver && item.driver.trim() && item.driver !== "PILIH DRIVER" && item.driver !== "-");

        const row = ws1.addRow([
            idx + 1,
            isPickup ? "AMBIL SUPPLIER" : "KIRIM CUSTOMER",
            item.driver || "BELUM ASSIGN",
            plate || "-",
            realInvoice,
            item.poNumber || "-",
            (item.buyerName || "-").toUpperCase(),
            (item.productName || "-").toUpperCase(),
            qtyNum,
            isLoaded ? "DIMUAT" : "ANTRI",
            "[   ] OK"
        ]);

        row.height = 22;

        const isZebra = idx % 2 === 1;
        const rowBgColor = isZebra ? "FFF8FAFC" : "FFFFFFFF";

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = thinBorder;
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBgColor } };
            cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF1E293B" } };
            cell.alignment = { vertical: "middle" };

            // Column 1: No
            if (colNumber === 1) {
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF64748B" } };
            }

            // Column 2: Kegiatan Badge
            if (colNumber === 2) {
                cell.alignment = { vertical: "middle", horizontal: "center" };
                if (isPickup) {
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
                    cell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FF92400E" } };
                } else {
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
                    cell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FF166534" } };
                }
            }

            // Column 3: Driver
            if (colNumber === 3) {
                cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF1E293B" } };
                cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
            }

            // Column 4: Plate
            if (colNumber === 4) {
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FF475569" } };
            }

            // Column 5: Invoice
            if (colNumber === 5) {
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.font = { name: "Consolas", size: 9, bold: true, color: { argb: "FF0F172A" } };
            }

            // Column 6: PO
            if (colNumber === 6) {
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF475569" } };
            }

            // Column 7: Buyer/Vendor
            if (colNumber === 7) {
                cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF0F172A" } };
                cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
            }

            // Column 8: Product
            if (colNumber === 8) {
                cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
            }

            // Column 9: Qty
            if (colNumber === 9) {
                cell.numFmt = "#,##0";
                cell.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
                cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF0F172A" } };
            }

            // Column 10: Status
            if (colNumber === 10) {
                cell.alignment = { vertical: "middle", horizontal: "center" };
                if (isLoaded) {
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
                    cell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FF047857" } };
                } else {
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
                    cell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FFB45309" } };
                }
            }

            // Column 11: Check
            if (colNumber === 11) {
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.font = { name: "Segoe UI", size: 8.5, bold: false, color: { argb: "FF94A3B8" } };
            }
        });

        currentRowNum++;
    });

    // Grand Total Row
    const grandTotalRowIndex = currentRowNum;
    ws1.mergeCells(`A${grandTotalRowIndex}:H${grandTotalRowIndex}`);
    const totLabel = ws1.getCell(`A${grandTotalRowIndex}`);
    totLabel.value = "TOTAL KESELURUHAN MUATAN FISIK (UNIT / KOLI)";
    totLabel.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
    totLabel.alignment = { vertical: "middle", horizontal: "right", indent: 2 };
    totLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    totLabel.border = totalBorder;

    // Apply borders across merged A-H
    for (let c = 1; c <= 8; c++) {
        const colLetter = String.fromCharCode(64 + c);
        const cell = ws1.getCell(`${colLetter}${grandTotalRowIndex}`);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        cell.border = totalBorder;
    }

    const totQtyCell = ws1.getCell(`I${grandTotalRowIndex}`);
    totQtyCell.value = { formula: `SUM(I${tableStartRow}:I${grandTotalRowIndex - 1})`, date1904: false };
    totQtyCell.numFmt = "#,##0";
    totQtyCell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF0F172A" } };
    totQtyCell.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
    totQtyCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    totQtyCell.border = totalBorder;

    // Empty cells for Status & Check on total row
    ws1.getCell(`J${grandTotalRowIndex}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    ws1.getCell(`J${grandTotalRowIndex}`).border = totalBorder;
    ws1.getCell(`K${grandTotalRowIndex}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    ws1.getCell(`K${grandTotalRowIndex}`).border = totalBorder;
    ws1.getRow(grandTotalRowIndex).height = 26;

    // Accountability & Signature Section
    const sigStart = grandTotalRowIndex + 3;
    ws1.getRow(sigStart - 1).height = 12;

    // Signatures: 3 Columns
    ws1.mergeCells(`B${sigStart}:D${sigStart}`);
    ws1.getCell(`B${sigStart}`).value = "Dibuat Oleh:";
    ws1.getCell(`B${sigStart}`).font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF334155" } };
    ws1.getCell(`B${sigStart}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    ws1.getCell(`B${sigStart}`).alignment = { vertical: "middle", horizontal: "center" };
    ws1.getCell(`B${sigStart}`).border = thinBorder;

    ws1.mergeCells(`E${sigStart}:G${sigStart}`);
    ws1.getCell(`E${sigStart}`).value = "Diperiksa & Dibawa:";
    ws1.getCell(`E${sigStart}`).font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF334155" } };
    ws1.getCell(`E${sigStart}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    ws1.getCell(`E${sigStart}`).alignment = { vertical: "middle", horizontal: "center" };
    ws1.getCell(`E${sigStart}`).border = thinBorder;

    ws1.mergeCells(`H${sigStart}:J${sigStart}`);
    ws1.getCell(`H${sigStart}`).value = "Disetujui Oleh:";
    ws1.getCell(`H${sigStart}`).font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF334155" } };
    ws1.getCell(`H${sigStart}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    ws1.getCell(`H${sigStart}`).alignment = { vertical: "middle", horizontal: "center" };
    ws1.getCell(`H${sigStart}`).border = thinBorder;
    ws1.getRow(sigStart).height = 20;

    // Role Subtitles
    const sigRole = sigStart + 1;
    ws1.mergeCells(`B${sigRole}:D${sigRole}`);
    ws1.getCell(`B${sigRole}`).value = "Checker / Staff Administrasi Gudang";
    ws1.getCell(`B${sigRole}`).font = { name: "Segoe UI", size: 8.5, color: { argb: "FF64748B" } };
    ws1.getCell(`B${sigRole}`).alignment = { vertical: "middle", horizontal: "center" };

    ws1.mergeCells(`E${sigRole}:G${sigRole}`);
    ws1.getCell(`E${sigRole}`).value = "Koordinator Sopir / Driver Armada";
    ws1.getCell(`E${sigRole}`).font = { name: "Segoe UI", size: 8.5, color: { argb: "FF64748B" } };
    ws1.getCell(`E${sigRole}`).alignment = { vertical: "middle", horizontal: "center" };

    ws1.mergeCells(`H${sigRole}:J${sigRole}`);
    ws1.getCell(`H${sigRole}`).value = "Kepala Operasional & Logistik";
    ws1.getCell(`H${sigRole}`).font = { name: "Segoe UI", size: 8.5, color: { argb: "FF64748B" } };
    ws1.getCell(`H${sigRole}`).alignment = { vertical: "middle", horizontal: "center" };
    ws1.getRow(sigRole).height = 18;

    // Blank Signature Space
    ws1.getRow(sigRole + 1).height = 42;

    // Signature Names
    const sigName = sigRole + 2;
    ws1.mergeCells(`B${sigName}:D${sigName}`);
    ws1.getCell(`B${sigName}`).value = `(  ${userName.toUpperCase()}  )`;
    ws1.getCell(`B${sigName}`).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF0F172A" } };
    ws1.getCell(`B${sigName}`).alignment = { vertical: "middle", horizontal: "center" };

    ws1.mergeCells(`E${sigName}:G${sigName}`);
    ws1.getCell(`E${sigName}`).value = "( .................................................... )";
    ws1.getCell(`E${sigName}`).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF0F172A" } };
    ws1.getCell(`E${sigName}`).alignment = { vertical: "middle", horizontal: "center" };

    ws1.mergeCells(`H${sigName}:J${sigName}`);
    ws1.getCell(`H${sigName}`).value = "( .................................................... )";
    ws1.getCell(`H${sigName}`).font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF0F172A" } };
    ws1.getCell(`H${sigName}`).alignment = { vertical: "middle", horizontal: "center" };
    ws1.getRow(sigName).height = 20;

    // Date Lines
    const sigDate = sigName + 1;
    ws1.mergeCells(`B${sigDate}:D${sigDate}`);
    ws1.getCell(`B${sigDate}`).value = `Tanggal: ${dateCode}`;
    ws1.getCell(`B${sigDate}`).font = { name: "Segoe UI", size: 8, color: { argb: "FF94A3B8" } };
    ws1.getCell(`B${sigDate}`).alignment = { vertical: "middle", horizontal: "center" };

    ws1.mergeCells(`E${sigDate}:G${sigDate}`);
    ws1.getCell(`E${sigDate}`).value = "Tanggal: _____ / _____ / 2026";
    ws1.getCell(`E${sigDate}`).font = { name: "Segoe UI", size: 8, color: { argb: "FF94A3B8" } };
    ws1.getCell(`E${sigDate}`).alignment = { vertical: "middle", horizontal: "center" };

    ws1.mergeCells(`H${sigDate}:J${sigDate}`);
    ws1.getCell(`H${sigDate}`).value = "Tanggal: _____ / _____ / 2026";
    ws1.getCell(`H${sigDate}`).font = { name: "Segoe UI", size: 8, color: { argb: "FF94A3B8" } };
    ws1.getCell(`H${sigDate}`).alignment = { vertical: "middle", horizontal: "center" };
    ws1.getRow(sigDate).height = 16;

    // =========================================================================
    // SHEET 2: REKAP EKSEKUTIF PER ARMADA KENDARAAN
    // =========================================================================
    const ws2 = wb.addWorksheet("Rekap Per Armada", {
        views: [{ showGridLines: true }],
        pageSetup: {
            paperSize: 9, // A4
            orientation: "landscape",
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0
        }
    });

    ws2.columns = [
        { key: "no", width: 6 },
        { key: "driver", width: 28 },
        { key: "plate", width: 16 },
        { key: "etoll", width: 18 },
        { key: "totalSj", width: 18 },
        { key: "totalItems", width: 18 },
        { key: "totalQty", width: 20 },
        { key: "destinations", width: 42 },
        { key: "status", width: 18 }
    ];

    // Header Sheet 2
    ws2.addRow([]);
    ws2.mergeCells("A2:I2");
    const r2_s2 = ws2.getCell("A2");
    r2_s2.value = "PT. KOLA BORASI INDONESIA";
    r2_s2.font = { name: "Segoe UI", size: 15, bold: true, color: { argb: "FF0F172A" } };
    r2_s2.alignment = { vertical: "middle", horizontal: "center" };

    ws2.mergeCells("A3:I3");
    const r3_s2 = ws2.getCell("A3");
    r3_s2.value = `RINGKASAN PEMUATAN PER ARMADA KENDARAAN - ${dateFormattedIndo}`;
    r3_s2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    r3_s2.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    r3_s2.alignment = { vertical: "middle", horizontal: "center" };
    ws2.getRow(3).height = 28;

    ws2.getRow(4).height = 10;

    // Table Headers Sheet 2
    const headersS2 = [
        "NO",
        "ARMADA / DRIVER",
        "NO. POLISI",
        "KARTU E-TOLL",
        "JUMLAH SURAT JALAN",
        "BARIS PRODUK",
        "TOTAL QTY (FISIK)",
        "DESTINASI / CUSTOMER TUJUAN",
        "STATUS OPERASIONAL"
    ];

    const headerRowS2 = ws2.addRow(headersS2);
    headerRowS2.height = 26;
    headerRowS2.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
        cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = headerBorder;
    });

    // Populate Sheet 2 Data
    const s2StartRow = 6;
    let s2CurrentRow = s2StartRow;

    // Grouping by driver
    const sortedDrivers = Array.from(driverGroupMap.entries()).sort((a, b) => {
        if (a[0] === "BELUM ASSIGN") return 1;
        if (b[0] === "BELUM ASSIGN") return -1;
        return a[0].localeCompare(b[0]);
    });

    sortedDrivers.forEach(([driverName, dItems], s2Idx) => {
        const first = dItems[0] || {};
        let plate = first.vehiclePlate || "";
        let etoll = first.etollCard || "";

        if ((!plate || !etoll) && driverName !== "BELUM ASSIGN") {
            const f = getFleetByDriverOrPlate(driverName);
            if (f) {
                if (!plate) plate = f.plate;
                if (!etoll) etoll = f.etoll;
            }
        }

        const distinctInvoices = new Set<string>();
        const destinationsSet = new Set<string>();
        let sumDriverQty = 0;

        dItems.forEach((itm, itmIdx) => {
            sumDriverQty += Number(itm.quantity) || 0;
            const inv = getExportInvoiceNumber(itm, selectedDate, itmIdx);
            distinctInvoices.add(inv);
            if (itm.buyerName) destinationsSet.add(itm.buyerName.toUpperCase());
        });

        const destListStr = Array.from(destinationsSet).slice(0, 4).join(", ") +
            (destinationsSet.size > 4 ? ` (+${destinationsSet.size - 4} lainnya)` : "");

        const isUnassigned = driverName === "BELUM ASSIGN";

        const row = ws2.addRow([
            s2Idx + 1,
            isUnassigned ? "LANTAI GUDANG (BELUM DIMUAT)" : driverName,
            plate || "-",
            etoll || "-",
            distinctInvoices.size,
            dItems.length,
            sumDriverQty,
            destListStr || "-",
            isUnassigned ? "MENUNGGU ARMADA" : "SIAP BERANGKAT"
        ]);

        row.height = 24;
        const isZebra = s2Idx % 2 === 1;
        const rowBg = isZebra ? "FFF8FAFC" : "FFFFFFFF";

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = thinBorder;
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
            cell.font = { name: "Segoe UI", size: 9, color: { argb: "FF1E293B" } };
            cell.alignment = { vertical: "middle" };

            if (colNumber === 1) {
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF64748B" } };
            }
            if (colNumber === 2) {
                cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: isUnassigned ? "FFB45309" : "FF0F172A" } };
                cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
            }
            if (colNumber === 3 || colNumber === 4) {
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF475569" } };
            }
            if (colNumber === 5 || colNumber === 6) {
                cell.numFmt = "#,##0";
                cell.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
                cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF334155" } };
            }
            if (colNumber === 7) {
                cell.numFmt = "#,##0";
                cell.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
                cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
            }
            if (colNumber === 8) {
                cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
                cell.font = { name: "Segoe UI", size: 8.5, color: { argb: "FF1E293B" } };
            }
            if (colNumber === 9) {
                cell.alignment = { vertical: "middle", horizontal: "center" };
                if (isUnassigned) {
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
                    cell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FFB45309" } };
                } else {
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
                    cell.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: "FF047857" } };
                }
            }
        });

        s2CurrentRow++;
    });

    // Sheet 2 Total Row
    const s2TotalRow = s2CurrentRow;
    ws2.mergeCells(`A${s2TotalRow}:D${s2TotalRow}`);
    const s2TotLabel = ws2.getCell(`A${s2TotalRow}`);
    s2TotLabel.value = "TOTAL REKAPITULASI SELURUH ARMADA";
    s2TotLabel.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF0F172A" } };
    s2TotLabel.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
    s2TotLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    s2TotLabel.border = totalBorder;

    for (let c = 1; c <= 4; c++) {
        const colLetter = String.fromCharCode(64 + c);
        const cell = ws2.getCell(`${colLetter}${s2TotalRow}`);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        cell.border = totalBorder;
    }

    // Col 5: Total SJ
    const c5 = ws2.getCell(`E${s2TotalRow}`);
    c5.value = { formula: `SUM(E${s2StartRow}:E${s2TotalRow - 1})`, date1904: false };
    c5.numFmt = "#,##0";
    c5.font = { name: "Segoe UI", size: 9.5, bold: true };
    c5.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
    c5.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    c5.border = totalBorder;

    // Col 6: Total Items
    const c6 = ws2.getCell(`F${s2TotalRow}`);
    c6.value = { formula: `SUM(F${s2StartRow}:F${s2TotalRow - 1})`, date1904: false };
    c6.numFmt = "#,##0";
    c6.font = { name: "Segoe UI", size: 9.5, bold: true };
    c6.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
    c6.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    c6.border = totalBorder;

    // Col 7: Total Qty
    const c7 = ws2.getCell(`G${s2TotalRow}`);
    c7.value = { formula: `SUM(G${s2StartRow}:G${s2TotalRow - 1})`, date1904: false };
    c7.numFmt = "#,##0";
    c7.font = { name: "Segoe UI", size: 10.5, bold: true };
    c7.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
    c7.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    c7.border = totalBorder;

    ws2.getCell(`H${s2TotalRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    ws2.getCell(`H${s2TotalRow}`).border = totalBorder;
    ws2.getCell(`I${s2TotalRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    ws2.getCell(`I${s2TotalRow}`).border = totalBorder;
    ws2.getRow(s2TotalRow).height = 26;

    // Trigger Browser Download or Return Buffer
    const buffer = await wb.xlsx.writeBuffer();
    
    if (typeof window !== "undefined" && typeof document !== "undefined") {
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        const cleanDateFilename = selectedDate.replace(/-/g, "");
        const filename = `${filenamePrefix}_${cleanDateFilename}.xlsx`;

        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
    }

    return;
}

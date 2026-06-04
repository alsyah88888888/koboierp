"use server";

import { getPrisma } from "@/lib/prisma";
import { getAuthOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

async function checkTaxAuth() {
  const session = await getServerSession(getAuthOptions()) as any;
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Harap login terlebih dahulu.");
  }
  
  const isMainAdmin = session.user.role?.toUpperCase() === "ADMIN";
  const userPermissions = session.user.permissions || [];
  const hasTaxPermission = userPermissions.includes("TAX");
  
  if (!isMainAdmin && !hasTaxPermission) {
    throw new Error("Unauthorized: Anda tidak memiliki akses ke modul perpajakan.");
  }
  
  return session;
}

/**
 * Mendapatkan data perpajakan (PPN Keluaran dan PPN Masukan) untuk periode tertentu
 */
export async function getTaxDataAction(month?: number, year?: number, startDateStr?: string, endDateStr?: string) {
  await checkTaxAuth();
  const prisma = getPrisma();
  
  let startDate: Date;
  let endDate: Date;

  if (startDateStr && endDateStr) {
    const startParts = startDateStr.split("-").map(Number);
    const endParts = endDateStr.split("-").map(Number);
    
    startDate = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0));
    startDate.setUTCHours(startDate.getUTCHours() - 7);
    
    endDate = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999));
    endDate.setUTCHours(endDate.getUTCHours() - 7);
  } else {
    const filterYear = year || new Date().getFullYear();
    const filterMonth = month || (new Date().getMonth() + 1);
    
    startDate = new Date(Date.UTC(filterYear, filterMonth - 1, 1, 0, 0, 0));
    startDate.setUTCHours(startDate.getUTCHours() - 7);
    
    endDate = new Date(Date.UTC(filterYear, filterMonth, 0, 23, 59, 59, 999));
    endDate.setUTCHours(endDate.getUTCHours() - 7);
  }
  
  try {
    const [salesDeliveries, goodsReceipts] = await Promise.all([
      // PPN Keluaran (Penjualan)
      (prisma as any).salesDelivery.findMany({
        where: {
          isVoid: false,
          taxRate: { gt: 0 },
          date: { gte: startDate, lte: endDate }
        },
        include: {
          items: {
            include: {
              product: { select: { sku: true, name: true, uom: true } }
            }
          }
        },
        orderBy: { date: "asc" }
      }),
      // PPN Masukan (Pembelian)
      (prisma as any).goodsReceipt.findMany({
        where: {
          isVoid: false,
          taxRate: { gt: 0 },
          date: { gte: startDate, lte: endDate }
        },
        orderBy: { date: "asc" }
      })
    ]);
    
    return {
      success: true,
      salesDeliveries: JSON.parse(JSON.stringify(salesDeliveries)),
      goodsReceipts: JSON.parse(JSON.stringify(goodsReceipts))
    };
  } catch (err: any) {
    console.error("Error fetching tax data:", err);
    return { success: false, error: err.message || "Gagal mengambil data perpajakan" };
  }
}

/**
 * Memperbarui Nomor Faktur Pajak (NSFP) untuk Surat Jalan Penjualan (PPN Keluaran)
 */
export async function updateSalesTaxInvoiceAction(id: string, taxInvoiceNumber: string | null, taxInvoiceDate: string | null) {
  await checkTaxAuth();
  const prisma = getPrisma();
  
  try {
    await (prisma as any).salesDelivery.update({
      where: { id },
      data: {
        taxInvoiceNumber,
        taxInvoiceDate: taxInvoiceDate ? new Date(taxInvoiceDate) : null
      }
    });
    
    revalidatePath("/tax");
    return { success: true };
  } catch (err: any) {
    console.error("Error updating sales tax invoice:", err);
    return { success: false, error: err.message || "Gagal memperbarui faktur penjualan" };
  }
}

/**
 * Memperbarui Nomor Faktur Pajak (NSFP) untuk Penerimaan Barang LPB (PPN Masukan)
 */
export async function updatePurchaseTaxInvoiceAction(id: string, taxInvoiceNumber: string | null, taxInvoiceDate: string | null) {
  await checkTaxAuth();
  const prisma = getPrisma();
  
  try {
    await (prisma as any).goodsReceipt.update({
      where: { id },
      data: {
        taxInvoiceNumber,
        taxInvoiceDate: taxInvoiceDate ? new Date(taxInvoiceDate) : null
      }
    });
    
    revalidatePath("/tax");
    return { success: true };
  } catch (err: any) {
    console.error("Error updating purchase tax invoice:", err);
    return { success: false, error: err.message || "Gagal memperbarui faktur pembelian" };
  }
}

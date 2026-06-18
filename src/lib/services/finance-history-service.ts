import { getPrisma } from "@/lib/prisma";

export async function getApprovalHistoryService(
    period: 'daily' | 'weekly' | 'monthly', 
    dateStr: string,
    prefix?: 'PF' | 'BC' | 'ALL'
) {
    const prisma = getPrisma();
    
    try {
        const targetDate = new Date(dateStr);
        let startDate: Date;
        let endDate: Date;

        // Tentukan rentang waktu berdasarkan periode, dengan penyesuaian zona waktu WIB (UTC+7)
        if (period === 'daily') {
            startDate = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0));
            startDate.setUTCHours(startDate.getUTCHours() - 7);
            endDate = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));
            endDate.setUTCHours(endDate.getUTCHours() - 7);
        } else if (period === 'weekly') {
            const day = targetDate.getDay();
            const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1); // Senin sbg awal minggu
            const startOfWeek = new Date(targetDate.setDate(diff));
            const endOfWeek = new Date(targetDate.setDate(diff + 6));
            
            startDate = new Date(Date.UTC(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate(), 0, 0, 0));
            startDate.setUTCHours(startDate.getUTCHours() - 7);
            endDate = new Date(Date.UTC(endOfWeek.getFullYear(), endOfWeek.getMonth(), endOfWeek.getDate(), 23, 59, 59, 999));
            endDate.setUTCHours(endDate.getUTCHours() - 7);
        } else {
            // monthly
            startDate = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0));
            startDate.setUTCHours(startDate.getUTCHours() - 7);
            endDate = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999));
            endDate.setUTCHours(endDate.getUTCHours() - 7);
        }

        const isAll = !prefix || prefix === 'ALL';

        // Tarik data FinanceTransaction (PAYMENT untuk Hutang, RECEIPT untuk Piutang)
        const transactions = await prisma.financeTransaction.findMany({
            where: {
                date: { gte: startDate, lte: endDate },
                transactionType: { in: ['PAYMENT', 'RECEIPT'] },
                ...(isAll ? {} : {
                    OR: [
                        { salesPerson: prefix },
                        { description: { contains: prefix, mode: 'insensitive' } }
                    ]
                })
            },
            include: {
                journals: {
                    include: { account: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        // Ambil semua invoice numbers unik untuk melookup SalesDelivery (Piutang) dan GoodsReceipt (Hutang)
        const allRefs = transactions.flatMap((t: any) => [t.invoiceNumber, t.receiptNumber, t.referenceNumber]).filter(Boolean) as string[];
        const uniqueRefs = [...new Set(allRefs)];

        // Lookup SalesDelivery (Piutang / AR)
        const salesDeliveries = uniqueRefs.length > 0 ? await (prisma as any).salesDelivery.findMany({
            where: {
                OR: [
                    { deliveryNumber: { in: uniqueRefs } },
                    { invoiceNumber: { in: uniqueRefs } }
                ]
            },
            select: { deliveryNumber: true, invoiceNumber: true, buyerName: true, recipient: true, grandTotal: true, isVoid: true }
        }) : [];
        const sdMap = new Map();
        salesDeliveries.forEach((sd: any) => {
            if (sd.deliveryNumber) sdMap.set(sd.deliveryNumber, sd);
            if (sd.invoiceNumber) sdMap.set(sd.invoiceNumber, sd);
        });

        // Lookup GoodsReceipt (Hutang / AP)
        const goodsReceipts = uniqueRefs.length > 0 ? await (prisma as any).goodsReceipt.findMany({
            where: {
                OR: [
                    { receiptNumber: { in: uniqueRefs } },
                    { formNumber: { in: uniqueRefs } }
                ]
            },
            select: { receiptNumber: true, formNumber: true, receivedFrom: true, grandTotal: true, isVoid: true }
        }) : [];
        const grMap = new Map();
        goodsReceipts.forEach((gr: any) => {
            if (gr.receiptNumber) grMap.set(gr.receiptNumber, gr);
            if (gr.formNumber) grMap.set(gr.formNumber, gr);
        });

        // Map data akhir
        const result = transactions.map((t: any) => {
            let type: 'AP' | 'AR' | 'UNKNOWN' = 'UNKNOWN';
            let entityName = '-';
            let documentTotal = 0;
            let status = 'APPROVED'; // default karena ini transaksi riil

            if (t.transactionType === 'PAYMENT') {
                type = 'AP';
            } else if (t.transactionType === 'RECEIPT') {
                type = 'AR';
            }

            const invoiceNo = t.invoiceNumber || t.receiptNumber || t.referenceNumber;

            if (type === 'AR') {
                const searchKeys = [t.invoiceNumber, t.referenceNumber].filter(Boolean);
                let sd = null;
                for (const key of searchKeys) {
                    if (sdMap.has(key)) {
                        sd = sdMap.get(key);
                        break;
                    }
                }
                if (sd) {
                    entityName = sd.buyerName || sd.recipient;
                    documentTotal = Number(sd.grandTotal || 0);
                    if (sd.isVoid) status = 'VOID';
                }
            } else if (type === 'AP') {
                const searchKeys = [t.receiptNumber, t.referenceNumber].filter(Boolean);
                let gr = null;
                for (const key of searchKeys) {
                    if (grMap.has(key)) {
                        gr = grMap.get(key);
                        break;
                    }
                }
                if (gr) {
                    entityName = gr.receivedFrom;
                    documentTotal = Number(gr.grandTotal || 0);
                    if (gr.isVoid) status = 'VOID';
                }
            }

            // Extract the real bank account name from journals
            let realBankName = t.bank;
            if (t.journals && t.journals.length > 0) {
                // Find journal entry hitting cash/bank accounts (101, 102, 106, 107, 108)
                const cashJournal = t.journals.find((j: any) => 
                    j.account && ["101", "102", "106", "107", "108"].includes(j.account.code)
                );
                if (cashJournal) {
                    realBankName = cashJournal.account.name;
                }
            }

            return {
                id: t.id,
                date: t.date,
                documentNumber: invoiceNo || '-',
                type,
                entityName,
                description: t.description,
                bank: realBankName,
                paidAmount: Math.abs(Number(t.amount || 0)),
                documentTotal,
                salesPerson: t.salesPerson || '-',
                status
            };
        });

        // Summary
        let totalApprovedAP = 0;
        let totalApprovedAR = 0;
        result.forEach((r: any) => {
            if (r.status === 'VOID') return;
            if (r.type === 'AP') totalApprovedAP += r.paidAmount;
            if (r.type === 'AR') totalApprovedAR += r.paidAmount;
        });

        return {
            transactions: result,
            summary: {
                totalApprovedAP,
                totalApprovedAR,
                netCashflow: totalApprovedAR - totalApprovedAP
            }
        };

    } catch (error: any) {
        console.error('[getApprovalHistoryService] ERROR:', error);
        return { error: error.message || 'Failed to fetch approval history' };
    }
}

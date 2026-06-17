import { getPrisma } from "@/lib/prisma";

export interface AgingBucket {
    "0-30": number;
    "31-60": number;
    "61-90": number;
    ">90": number;
}

export interface AgingRecord {
    id: string; // Entity Name (Customer/Supplier)
    name: string;
    totalUnpaid: number;
    buckets: AgingBucket;
    transactions: {
        id: string;
        number: string;
        date: Date;
        grandTotal: number;
        paidAmount: number;
        unpaidAmount: number;
        ageDays: number;
        paymentStatus: string;
    }[];
}

export async function getAgingReportService() {
    const prisma = getPrisma();
    const today = new Date();

    // 1. Fetch A/R (Piutang) from SalesDelivery
    const salesDeliveries = await (prisma as any).salesDelivery.findMany({
        where: {
            isVoid: false,
            paymentStatus: { in: ["PENDING", "PARTIAL"] }
        },
        select: {
            id: true,
            deliveryNumber: true,
            invoiceNumber: true,
            buyerName: true,
            recipient: true,
            date: true,
            grandTotal: true,
            paidAmount: true,
            paymentStatus: true
        }
    });

    // 2. Fetch A/P (Hutang) from GoodsReceipt
    const goodsReceipts = await (prisma as any).goodsReceipt.findMany({
        where: {
            isVoid: false,
            paymentStatus: { in: ["PENDING", "PARTIAL"] }
        },
        select: {
            id: true,
            receiptNumber: true,
            receivedFrom: true,
            date: true,
            grandTotal: true,
            paidAmount: true,
            paymentStatus: true
        }
    });

    const calculateAge = (date: Date) => {
        const diffTime = Math.abs(today.getTime() - new Date(date).getTime());
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    const processRecords = (records: any[], entityKey: string) => {
        const result = new Map<string, AgingRecord>();

        for (const record of records) {
            const entityName = record[entityKey] || "Unknown";
            const unpaidAmount = Number(record.grandTotal || 0) - Number(record.paidAmount || 0);
            if (unpaidAmount <= 0) continue;

            const ageDays = calculateAge(record.date);
            
            if (!result.has(entityName)) {
                result.set(entityName, {
                    id: entityName,
                    name: entityName,
                    totalUnpaid: 0,
                    buckets: { "0-30": 0, "31-60": 0, "61-90": 0, ">90": 0 },
                    transactions: []
                });
            }

            const entityEntry = result.get(entityName)!;
            entityEntry.totalUnpaid += unpaidAmount;

            if (ageDays <= 30) entityEntry.buckets["0-30"] += unpaidAmount;
            else if (ageDays <= 60) entityEntry.buckets["31-60"] += unpaidAmount;
            else if (ageDays <= 90) entityEntry.buckets["61-90"] += unpaidAmount;
            else entityEntry.buckets[">90"] += unpaidAmount;

            entityEntry.transactions.push({
                id: record.id,
                number: record.invoiceNumber || record.deliveryNumber || record.receiptNumber,
                date: record.date,
                grandTotal: Number(record.grandTotal),
                paidAmount: Number(record.paidAmount),
                unpaidAmount,
                ageDays,
                paymentStatus: record.paymentStatus
            });
        }

        // Convert Map to Array and sort by totalUnpaid descending
        return Array.from(result.values()).sort((a, b) => b.totalUnpaid - a.totalUnpaid);
    };

    const arData = processRecords(salesDeliveries, "buyerName"); // "buyerName" or "recipient"
    // For GoodsReceipt, supplier name is in "receivedFrom"
    const apData = processRecords(goodsReceipts, "receivedFrom");

    return {
        success: true,
        receivables: arData, // Piutang
        payables: apData,   // Hutang
        summary: {
            totalAR: arData.reduce((sum, item) => sum + item.totalUnpaid, 0),
            totalAP: apData.reduce((sum, item) => sum + item.totalUnpaid, 0)
        }
    };
}

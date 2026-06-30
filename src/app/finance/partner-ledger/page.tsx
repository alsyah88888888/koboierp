import { getPrisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";
import { serializeDecimal } from "@/lib/utils";
import { PartnerLedger } from "./PartnerLedger";

export default async function PartnerLedgerPage() {
    await headers();
    const prisma = getPrisma();
    const session = await getServerSession(getAuthOptions()) as any;
    if (!session) redirect("/login");

    const [
        salesDeliveries,
        goodsReceipts,
        salesReturns,
        purchaseReturns,
        purchaseOrders,
    ] = await Promise.all([
        prisma.salesDelivery.findMany({
            where: { isVoid: false },
            orderBy: { date: "desc" },
            select: {
                id: true,
                deliveryNumber: true,
                invoiceNumber: true,
                buyerName: true,
                date: true,
                grandTotal: true,
                paidAmount: true,
                paymentStatus: true,
                createdAt: true,
                updatedAt: true,
                returns: {
                    select: {
                        id: true,
                        returnNumber: true,
                        date: true,
                        status: true,
                        isVoid: true,
                        items: { select: { quantity: true, product: { select: { name: true } } } }
                    }
                }
            }
        }),
        prisma.goodsReceipt.findMany({
            where: { isVoid: false },
            orderBy: { date: "desc" },
            select: {
                id: true,
                receiptNumber: true,
                receivedFrom: true,
                date: true,
                grandTotal: true,
                paidAmount: true,
                paymentStatus: true,
                isVerified: true,
                createdAt: true,
                updatedAt: true,
                items: { select: { quantity: true, product: { select: { name: true } }, purchasePrice: true } },
            }
        }),
        prisma.salesReturn.findMany({
            where: { isVoid: false },
            select: {
                id: true,
                returnNumber: true,
                date: true,
                status: true,
                deliveryId: true,
                items: { select: { quantity: true, product: { select: { name: true } } } }
            }
        }),
        prisma.purchaseReturn.findMany({
            where: { isVoid: false },
            select: {
                id: true,
                returnNumber: true,
                date: true,
                status: true,
                receiptId: true,
                items: { select: { quantity: true, product: { select: { name: true } } } }
            }
        }),
        prisma.purchaseOrder.findMany({
            orderBy: { date: "desc" },
            select: {
                id: true,
                poNumber: true,
                vendorName: true,
                date: true,
                status: true,
                totalAmount: true,
            }
        }),
    ]);

    return (
        <PartnerLedger
            salesDeliveries={serializeDecimal(salesDeliveries)}
            goodsReceipts={serializeDecimal(goodsReceipts)}
            salesReturns={serializeDecimal(salesReturns)}
            purchaseReturns={serializeDecimal(purchaseReturns)}
            purchaseOrders={serializeDecimal(purchaseOrders)}
        />
    );
}

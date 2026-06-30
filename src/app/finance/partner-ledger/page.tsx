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

    const [salesDeliveries, goodsReceipts, purchaseOrders] = await Promise.all([
        prisma.salesDelivery.findMany({
            where: { isVoid: false },
            orderBy: { date: "desc" },
            select: {
                id: true, deliveryNumber: true, invoiceNumber: true,
                buyerName: true, date: true, grandTotal: true,
                paidAmount: true, paymentStatus: true,
                returns: {
                    where: { isVoid: false },
                    select: {
                        id: true, returnNumber: true, date: true, status: true,
                        items: { select: { quantity: true, product: { select: { name: true } } } }
                    }
                }
            }
        }),
        prisma.goodsReceipt.findMany({
            where: { isVoid: false },
            orderBy: { date: "desc" },
            select: {
                id: true, receiptNumber: true, receivedFrom: true,
                date: true, grandTotal: true, paidAmount: true, paymentStatus: true,
                returns: {
                    where: { isVoid: false },
                    select: {
                        id: true, returnNumber: true, date: true, status: true,
                        items: { select: { quantity: true, product: { select: { name: true } } } }
                    }
                }
            }
        }),
        prisma.purchaseOrder.findMany({
            orderBy: { date: "desc" },
            select: {
                id: true,
                number: true,
                vendorId: true,
                date: true,
                status: true,
                vendor: { select: { name: true } },
                items: { select: { price: true, quantity: true } }
            }
        }),
    ]);

    const normalizedPOs = purchaseOrders.map((po: any) => ({
        id: po.id,
        poNumber: po.number,
        vendorName: po.vendor?.name || "",
        date: po.date,
        status: po.status,
        totalAmount: (po.items || []).reduce((s: number, i: any) => s + Number(i.price) * Number(i.quantity), 0),
    }));

    return (
        <PartnerLedger
            salesDeliveries={serializeDecimal(salesDeliveries)}
            goodsReceipts={serializeDecimal(goodsReceipts)}
            purchaseOrders={serializeDecimal(normalizedPOs)}
        />
    );
}

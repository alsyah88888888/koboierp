import { getPrisma } from "@/lib/prisma";
import DeliveryDashboard from "./DeliveryDashboard";
import { serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";

export default async function DeliveryPage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const prisma = getPrisma();
    const session = await getServerSession(getAuthOptions()) as any;

    if (!session) {
        redirect("/login");
    }

    const isAdmin = session?.user?.role?.toUpperCase() === "ADMIN";
    const userRole = session?.user?.role?.toUpperCase() || "";

    // Access check: ADMIN, WAREHOUSE, PURCHASE, and SALES can access Surat Jalan
    const allowedRoles = ["ADMIN", "WAREHOUSE", "SALES", "PURCHASE"];
    if (!allowedRoles.includes(userRole)) {
        redirect("/");
    }

    const userFilter = {};
    
    const [
        rawProducts,
        rawWarehouses,
        rawDeliveries,
        rawCustomers,
        rawSalesOrders,
        rawSystemSettings
    ] = await Promise.all([
        prisma.product.findMany({
            include: { stocks: true },
            orderBy: { sku: 'asc' }
        }).catch(() => []),
        prisma.warehouse.findMany().catch(() => []),
        prisma.salesDelivery.findMany({
            where: userFilter,
            include: { warehouse: true, items: { include: { product: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        }).catch(() => []),
        prisma.customer.findMany({
            orderBy: { name: 'asc' }
        }).catch(() => []),
        (prisma as any).salesOrder.findMany({
            where: {},
            include: { items: { include: { product: true } }, deliveries: true },
            orderBy: { date: 'desc' },
            take: 100
        }).catch(() => []),
        prisma.systemSetting.findUnique({ where: { id: "global" } }).catch(() => null)
    ]);

    const products = serializeDecimal(rawProducts);
    const warehouses = serializeDecimal(rawWarehouses);
    const deliveries = serializeDecimal(rawDeliveries);
    const serializedCustomers = serializeDecimal(rawCustomers);
    const salesOrders = serializeDecimal(rawSalesOrders);
    const systemSettings = serializeDecimal(rawSystemSettings);

    return (
        <DeliveryDashboard
            initialDeliveries={deliveries}
            initialSalesOrders={salesOrders}
            products={products}
            warehouses={warehouses}
            customers={serializedCustomers}
            systemSettings={systemSettings}
        />
    );
}

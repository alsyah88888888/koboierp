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
    
    const products = serializeDecimal(await prisma.product.findMany({
        include: { stocks: true },
        orderBy: { sku: 'asc' }
    }).catch(() => []));

    const warehouses = serializeDecimal(await prisma.warehouse.findMany().catch(() => []));

    const deliveries = serializeDecimal(await prisma.salesDelivery.findMany({
        where: userFilter,
        include: { warehouse: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
    }).catch(() => []));

    const serializedCustomers = serializeDecimal(await prisma.customer.findMany({
        orderBy: { name: 'asc' }
    }).catch(() => []));

    const salesOrders = serializeDecimal(await (prisma as any).salesOrder.findMany({
        where: {},
        include: { items: { include: { product: true } }, deliveries: true },
        orderBy: { date: 'desc' }
    }).catch(() => []));

    const systemSettings = serializeDecimal(await prisma.systemSetting.findUnique({ where: { id: "global" } }).catch(() => null));

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

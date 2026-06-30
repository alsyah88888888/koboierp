import { getPrisma } from "@/lib/prisma";
import { TrackingDashboard } from "@/app/tracking/TrackingDashboard";
import { serializeDecimal } from "@/lib/utils";
import { headers } from "next/headers";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function TrackingPage() {
    await headers();
    
    const prisma = getPrisma();
    const session = await getServerSession(getAuthOptions()) as any;

    if (!session) {
        redirect("/login");
    }

    // Fetch all products with their stocks summarized
    const products = await prisma.product.findMany({
        include: { 
            stocks: true 
        },
        orderBy: { sku: 'asc' }
    }).catch(() => []);

    return (
        <TrackingDashboard 
            initialProducts={serializeDecimal(products)}
            userEmail={session?.user?.email || ""}
            userRole={session?.user?.role || ""}
        />
    );
}

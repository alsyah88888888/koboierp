import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { serializeDecimal } from "@/lib/utils";
import TaxDashboard from "./TaxDashboard";
import { headers } from "next/headers";

export default async function TaxPage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const session = await getServerSession(getAuthOptions()) as any;

    if (!session?.user) {
        redirect("/api/auth/signin");
    }

    const isAdmin = session.user.role?.toUpperCase() === "ADMIN";
    const permissions = session.user.permissions || [];
    const hasTaxPermission = permissions.includes("TAX");

    if (!isAdmin && !hasTaxPermission) {
        redirect("/");
    }

    const prisma = getPrisma();
    const systemSettings = serializeDecimal(
        await prisma.systemSetting.findUnique({ where: { id: "global" } }).catch(() => null)
    );

    return <TaxDashboard systemSettings={systemSettings} />;
}

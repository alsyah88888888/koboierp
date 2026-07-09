import { getPrisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuditDashboard } from "./AuditDashboard";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
    const session = await getServerSession(getAuthOptions()) as any;
    
    // Only Admin can view Audit Logs
    if (!session || session.user?.role !== "ADMIN") {
        redirect("/");
    }

    const prisma = getPrisma();

    // Fetch last 1000 logs initially to avoid overloading
    const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 1000,
        include: {
            user: { select: { id: true, name: true, role: true } }
        }
    });

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            <AuditDashboard initialLogs={logs} />
        </div>
    );
}

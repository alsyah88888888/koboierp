import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { ReportsDashboard } from "@/app/reports/ReportsDashboard";

export default async function ReportsPage() {
    await headers();
    const session = await getServerSession(getAuthOptions()) as any;

    if (!session) {
        redirect("/api/auth/signin");
    }

    const userRole = session?.user?.role || "USER";
    
    // Only ADMIN and FINANCE can access reports
    if (!["ADMIN", "FINANCE"].includes(userRole)) {
        redirect("/");
    }

    return <ReportsDashboard />;
}

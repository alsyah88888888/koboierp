import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { ReportsDashboard } from "@/app/reports/ReportsDashboard";

export default async function ReportsPage() {
    await headers();
    const session = await getServerSession(getAuthOptions()) as any;

    if (!session) {
        redirect("/login");
    }

    const userRole = session?.user?.role || "USER";
    const userEmail = session?.user?.email || "";
    
    // Only ADMIN, FINANCE, or specific users can access reports
    const isAllowedRole = ["ADMIN", "FINANCE"].includes(userRole);
    const allowedEmails = [
        "fatiatunisia@kolaborasi.id", // Fatia
        "andi@kolaborasi.id", // Andi
        "andisetiandi@kolaborasi.id", // Andi
        "dwirismawan@kolaborasi.id", // Dwi
        "kusmawani@kolaborasi.id" // Kusumawani
    ];
    const isAllowedEmail = allowedEmails.includes(userEmail);

    if (!isAllowedRole && !isAllowedEmail) {
        redirect("/");
    }

    return <ReportsDashboard />;
}

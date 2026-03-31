export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MasterDataDashboard } from "./MasterDataDashboard";

import { headers } from "next/headers";

export default async function MasterDataPage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const session = await getServerSession(authOptions) as any;

    if (!session?.user) {
        redirect("/auth/signin");
    }

    if (!["ADMIN", "PURCHASE"].includes(session.user.role)) {
        redirect("/");
    }

    return (
        <div className="p-4 md:p-8">
            <MasterDataDashboard />
        </div>
    );
}

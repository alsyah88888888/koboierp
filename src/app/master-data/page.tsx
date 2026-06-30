import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MasterDataDashboard } from "./MasterDataDashboard";

import { headers } from "next/headers";

export default async function MasterDataPage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const session = await getServerSession(getAuthOptions()) as any;


    if (!session?.user) {
        redirect("/login");
    }

    if (!["ADMIN", "PURCHASE"].includes(session.user.role?.toUpperCase())) {
        redirect("/");
    }

    return (
        <div className="p-4 md:p-8">
            <MasterDataDashboard />
        </div>
    );
}

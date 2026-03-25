export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MasterDataDashboard } from "./MasterDataDashboard";

export default async function MasterDataPage() {
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

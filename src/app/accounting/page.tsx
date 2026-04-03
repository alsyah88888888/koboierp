export const dynamic = 'force-dynamic';

import { getAccountingDataAction } from "@/actions/finance";
import { AccountingDashboard } from "./AccountingDashboard";
import { serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { getAuthOptions } from "@/lib/auth";

export default async function AccountingPage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const session = await getServerSession(getAuthOptions()) as any;
    if (!session) {
        redirect("/api/auth/signin");
    }
    const { journals, accounts } = await getAccountingDataAction();
    return (
        <AccountingDashboard
            journals={serializeDecimal(journals)}
            accounts={serializeDecimal(accounts)}
        />
    );
}

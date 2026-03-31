export const dynamic = 'force-dynamic';

import { getAccountingDataAction } from "@/app/actions";
import { AccountingDashboard } from "./AccountingDashboard";
import { serializeDecimal } from "@/lib/utils";

import { headers } from "next/headers";

export default async function AccountingPage() {
    // Force dynamic rendering to skip build-time DB check
    await headers();
    
    const { journals, accounts } = await getAccountingDataAction();
    return (
        <AccountingDashboard
            journals={serializeDecimal(journals)}
            accounts={serializeDecimal(accounts)}
        />
    );
}

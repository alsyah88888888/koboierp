export const dynamic = 'force-dynamic';

import { getAccountingDataAction } from "@/app/actions";
import { AccountingDashboard } from "./AccountingDashboard";
import { serializeDecimal } from "@/lib/utils";

export default async function AccountingPage() {
    const { journals, accounts } = await getAccountingDataAction();
    return (
        <AccountingDashboard
            journals={serializeDecimal(journals)}
            accounts={serializeDecimal(accounts)}
        />
    );
}

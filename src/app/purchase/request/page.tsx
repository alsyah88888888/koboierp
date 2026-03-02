import { getPurchaseRequestsAction } from "@/app/actions";
import { PurchaseRequestDashboard } from "@/app/purchase/request/PurchaseRequestDashboard";
import { serializeDecimal } from "@/lib/utils";

export default async function PurchaseRequestPage() {
    const purchaseRequests = await getPurchaseRequestsAction();
    return (
        <PurchaseRequestDashboard
            purchaseRequests={serializeDecimal(purchaseRequests)}
        />
    );
}

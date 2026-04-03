/**
 * ACTION PROXY
 * This file breaks the Turbopack static dependency chain.
 * Client components call this proxy with an action name and payload.
 * The real server-side code is only loaded at runtime via dynamic import.
 */

export async function callAction(actionName: string, ...args: any[]) {
    // These strings MUST be literal for the static analyzer to stop tracing.
    // We map action names to dynamic imports.
    
    switch (actionName) {
        case "createSalesDelivery":
            const { createSalesDeliveryAction } = await import("@/actions/sales");
            return await createSalesDeliveryAction(...args as [any]);
        case "updateSalesDelivery":
            const { updateSalesDeliveryAction } = await import("@/actions/sales");
            return await updateSalesDeliveryAction(...args as [string, any]);
        case "deleteSalesDelivery":
            const { deleteSalesDeliveryAction } = await import("@/actions/sales");
            return await deleteSalesDeliveryAction(...args as [string]);
        case "createFinanceTransaction":
            const { createFinanceTransactionAction } = await import("@/actions/finance");
            return await createFinanceTransactionAction(...args as [any]);
        case "updatePaymentStatus":
            const { updatePaymentStatusAction } = await import("@/actions/finance");
            return await updatePaymentStatusAction(...args as [any, any, any, any, any]);
        case "getDashboardSummary":
            const { getDashboardSummaryAction } = await import("@/actions/system");
            return await getDashboardSummaryAction();
        case "getAccountingData":
            const { getAccountingDataAction } = await import("@/actions/finance");
            return await getAccountingDataAction();
        case "createProduct":
            const { createProductAction } = await import("@/actions/master");
            return await createProductAction(...args as [any]);
        case "updateProduct":
            const { updateProductAction } = await import("@/actions/master");
            return await updateProductAction(...args as [string, any]);
        case "deleteProduct":
            const { deleteProductAction } = await import("@/actions/master");
            return await deleteProductAction(...args as [string]);
        case "createGoodsReceipt":
            const { createGoodsReceiptAction } = await import("@/actions/purchase");
            return await createGoodsReceiptAction(...args as [any]);
        case "adjustStock":
            const { adjustStockAction } = await import("@/actions/warehouse");
            return await adjustStockAction(...args as [any]);
        default:
            throw new Error(`Action ${actionName} not found in proxy.`);
    }
}

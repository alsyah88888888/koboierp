import { NextResponse } from "next/server";
/**
 * ACTION PROXY
 * This file breaks the Turbopack static dependency chain.
 * Client components call this proxy with an action name and payload.
 * The real server-side code is only loaded at runtime via dynamic import.
 */

export async function callAction(actionName: string, ...args: any[]) {
    // Safety check: If called as a middleware or with a Request object, just pass through.
    if (actionName && typeof actionName === "object" && (actionName as any).url) {
        return NextResponse.next();
    }

    if (typeof actionName !== "string") {
        console.error("Invalid callAction invocation - actionName is not a string:", actionName);
        console.trace("Call stack for invalid callAction:");
        throw new Error(`Action name must be a string. Received: ${typeof actionName}`);
    }
    switch (actionName) {
        // SALES
        case "createSalesDelivery":
            const { createSalesDeliveryAction } = await import("@/actions/sales");
            return await createSalesDeliveryAction(...args as [any]);
        case "updateSalesDelivery":
            const { updateSalesDeliveryAction } = await import("@/actions/sales");
            return await updateSalesDeliveryAction(...args as [string, any]);
        case "deleteSalesDelivery":
            const { deleteSalesDeliveryAction } = await import("@/actions/sales");
            return await deleteSalesDeliveryAction(...args as [string]);
        case "verifySalesReturn":
            const { verifySalesReturnAction } = await import("@/actions/sales");
            return await verifySalesReturnAction(...args as [string]);
        case "getCortexXmlContent":
            const { getCortexXmlContentAction } = await import("@/actions/sales");
            return await getCortexXmlContentAction();
        case "createSalesReturn":
            const { createSalesReturnAction } = await import("@/actions/sales");
            return await createSalesReturnAction(...args as [any]);
        case "voidSalesDelivery":
            const { voidSalesDeliveryAction } = await import("@/actions/sales");
            return await voidSalesDeliveryAction(...args as [string, string]);

        // FINANCE
        case "createFinanceTransaction":
            const { createFinanceTransactionAction } = await import("@/actions/finance");
            return await createFinanceTransactionAction(...args as [any]);
        case "updatePaymentStatus":
            const { updatePaymentStatusAction } = await import("@/actions/finance");
            return await updatePaymentStatusAction(...args as [any, any, any, any, any]);
        case "deleteJournalEntry":
            const { deleteJournalEntryAction } = await import("@/actions/finance");
            return await deleteJournalEntryAction(...args as [string]);
        case "deleteFinanceTransaction":
            const { deleteFinanceTransactionAction } = await import("@/actions/finance");
            return await deleteFinanceTransactionAction(...args as [string]);
        case "getAccountingData":
            const { getAccountingDataAction } = await import("@/actions/finance");
            return await getAccountingDataAction();

        // PURCHASE
        case "createGoodsReceipt":
            const { createGoodsReceiptAction } = await import("@/actions/purchase");
            return await createGoodsReceiptAction(...args as [any]);
        case "updateGoodsReceipt":
            const { updateGoodsReceiptAction } = await import("@/actions/purchase");
            return await updateGoodsReceiptAction(...args as [string, any]);
        case "deleteGoodsReceipt":
            const { deleteGoodsReceiptAction } = await import("@/actions/purchase");
            return await deleteGoodsReceiptAction(...args as [string]);
        case "deletePurchaseReturn":
            const { deletePurchaseReturnAction } = await import("@/actions/purchase");
            return await deletePurchaseReturnAction(...args as [string]);

        case "updatePurchaseRequestStatus":
            const { updatePurchaseRequestStatusAction } = await import("@/actions/purchase");
            return await updatePurchaseRequestStatusAction(...args as [string, any]);
        case "getPurchaseRequestSummary":
            const { getPurchaseRequestSummaryAction } = await import("@/actions/purchase");
            return await getPurchaseRequestSummaryAction();

        case "deletePurchaseRequest":
            const { deletePurchaseRequestAction } = await import("@/actions/purchase");
            return await deletePurchaseRequestAction(...args as [string]);

        case "createPurchaseReturn":
            const { createPurchaseReturnAction } = await import("@/actions/purchase");
            return await createPurchaseReturnAction(...args as [any]);
        case "createPurchaseRequest":
            const { createPurchaseRequestAction } = await import("@/actions/purchase");
            return await createPurchaseRequestAction(...args as [any]);
        case "syncTransactionToPR":
            const { syncTransactionToPRAction } = await import("@/actions/purchase");
            return await syncTransactionToPRAction(...args as [string]);
        case "updatePurchaseRequest":
            const { updatePurchaseRequestAction } = await import("@/actions/purchase");
            return await updatePurchaseRequestAction(...args as [string, any]);
        case "createPurchaseOrder":
            const { createPurchaseOrderAction } = await import("@/actions/purchase");
            return await createPurchaseOrderAction(...args as [any]);

        // MASTER
        case "createProduct":
            const { createProductAction } = await import("@/actions/master");
            return await createProductAction(...args as [any]);
        case "updateProduct":
            const { updateProductAction } = await import("@/actions/master");
            return await updateProductAction(...args as [string, any]);
        case "deleteProduct":
            const { deleteProductAction } = await import("@/actions/master");
            return await deleteProductAction(...args as [string]);
        case "importProducts":
            const { importProductsAction } = await import("@/actions/master");
            return await importProductsAction(...args as [any[]]);
        case "createVendor":
            const { createVendorAction } = await import("@/actions/master");
            return await createVendorAction(...args as [any]);
        case "updateVendor":
            const { updateVendorAction } = await import("@/actions/master");
            return await updateVendorAction(...args as [string, any]);
        case "deleteVendor":
            const { deleteVendorAction } = await import("@/actions/master");
            return await deleteVendorAction(...args as [string]);
        case "createCustomer":
            const { createCustomerAction } = await import("@/actions/master");
            return await createCustomerAction(...args as [any]);
        case "updateCustomer":
            const { updateCustomerAction } = await import("@/actions/master");
            return await updateCustomerAction(...args as [string, any]);
        case "deleteCustomer":
            const { deleteCustomerAction } = await import("@/actions/master");
            return await deleteCustomerAction(...args as [string]);
        case "createWarehouse":
            const { createWarehouseAction } = await import("@/actions/master");
            return await createWarehouseAction(...args as [any]);
        case "updateWarehouse":
            const { updateWarehouseAction } = await import("@/actions/master");
            return await updateWarehouseAction(...args as [string, any]);
        case "deleteWarehouse":
            const { deleteWarehouseAction } = await import("@/actions/master");
            return await deleteWarehouseAction(...args as [string]);

        // SYSTEM
        case "getDashboardSummary":
            const { getDashboardSummaryAction } = await import("@/actions/system");
            return await getDashboardSummaryAction();
        case "getSystemSettings":
            const { getSystemSettingsAction } = await import("@/actions/system");
            return await getSystemSettingsAction();
        case "updateSystemSettings":
            const { updateSystemSettingsAction } = await import("@/actions/system");
            return await updateSystemSettingsAction(...args as [any]);
        case "wipeDatabase":
            const { wipeDatabaseAction } = await import("@/actions/system");
            return await wipeDatabaseAction();
        case "getMD":
            const { getMDAction } = await import("@/actions/master");
            return await getMDAction();

        case "markNotificationAsRead":
            const { markNotificationAsReadAction } = await import("@/actions/system");
            return await markNotificationAsReadAction(...args as [string]);
        case "createNotification":
            const { createNotificationAction } = await import("@/actions/system");
            return await createNotificationAction(...args as [any]);
        case "getNotifications":
            const { getNotificationsAction } = await import("@/actions/system");
            return await getNotificationsAction();
        case "deleteNotification":
            const { deleteNotificationAction } = await import("@/actions/system");
            return await deleteNotificationAction(...args as [string]);


        // USERS
        case "getUsers":
            const { getUsersAction } = await import("@/app/settings/users/actions");
            return await getUsersAction();
        case "createUser":
            const { createUserAction } = await import("@/app/settings/users/actions");
            return await createUserAction(...args as [any]);
        case "updateUser":
            const { updateUserAction } = await import("@/app/settings/users/actions");
            return await updateUserAction(...args as [string, any]);
        case "deleteUser":
            const { deleteUserAction } = await import("@/app/settings/users/actions");
            return await deleteUserAction(...args as [string]);
        case "resetPassword":
            const { resetPasswordAction } = await import("@/app/settings/users/actions");
            return await resetPasswordAction(...args as [string, string]);


        // WAREHOUSE
        case "adjustStock":
            const { adjustStockAction } = await import("@/actions/warehouse");
            return await adjustStockAction(...args as [any]);
        case "verifyGoodsReceipt":
            const { verifyGoodsReceiptAction } = await import("@/actions/warehouse");
            return await verifyGoodsReceiptAction(...args as [string, string, any]);
        case "updateStock":
            const { updateStockAction } = await import("@/actions/warehouse");
            return await updateStockAction(...args as [any]);

        case "getGoodsReceipts":
            const { getGoodsReceiptsAction } = await import("@/actions/warehouse");
            return await getGoodsReceiptsAction();
        case "submitGoodsReceiptVerification":
            const { submitGoodsReceiptVerificationAction } = await import("@/actions/warehouse");
            return await submitGoodsReceiptVerificationAction(...args as [any]);

        case "getProductTracking":
            const { getProductTrackingAction } = await import("@/actions/warehouse");
            return await getProductTrackingAction(...args as [string]);

        case "voidGoodsReceipt":
            const { voidGoodsReceiptAction } = await import("@/actions/warehouse");
            return await voidGoodsReceiptAction(...args as [string, string]);

        case "executePurchaseRequest":
            const { executePurchaseRequestAction } = await import("@/actions/purchase");
            return await executePurchaseRequestAction(...args as [string, any]);


        default:
            throw new Error(`Action ${actionName} not found in proxy.`);
    }
}

export default callAction;


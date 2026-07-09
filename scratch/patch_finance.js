const fs = require('fs');
const file = 'src/actions/finance.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /return await createFinanceTransactionService\(data, session\?\.user\?\.id\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "CREATE_FINANCE_TRANSACTION", resource: "FinanceTransaction", details: data });\n    return await createFinanceTransactionService(data, session?.user?.id);`
);

content = content.replace(
    /return await updateFinanceTransactionService\(id, data, session\?\.user\?\.id\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "UPDATE_FINANCE_TRANSACTION", resource: "FinanceTransaction", resourceId: id, details: data });\n    return await updateFinanceTransactionService(id, data, session?.user?.id);`
);

content = content.replace(
    /return await deleteFinanceTransactionService\(id\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "DELETE_FINANCE_TRANSACTION", resource: "FinanceTransaction", resourceId: id });\n    return await deleteFinanceTransactionService(id);`
);

content = content.replace(
    /return await deleteBankMutationService\(id\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "DELETE_BANK_MUTATION", resource: "BankMutation", resourceId: id });\n    return await deleteBankMutationService(id);`
);

content = content.replace(
    /return await updatePaymentStatusService\(type, id, status, partialAmount, paymentDate, session\.user\.id, bankAccountId\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "UPDATE_PAYMENT_STATUS", resource: type, resourceId: id, details: { status, partialAmount, paymentDate, bankAccountId } });\n    return await updatePaymentStatusService(type, id, status, partialAmount, paymentDate, session.user.id, bankAccountId);`
);

content = content.replace(
    /return await reconcileMutationService\(mutationId, transactionId, session\?\.user\?\.id\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "RECONCILE_MUTATION", resource: "BankMutation", resourceId: mutationId, details: { transactionId } });\n    return await reconcileMutationService(mutationId, transactionId, session?.user?.id);`
);

content = content.replace(
    /return await unreconcileMutationService\(mutationId, session\?\.user\?\.id\);/g,
    `const { logAction } = require("@/lib/audit");\n    await logAction({ userId: session?.user?.id, action: "UNRECONCILE_MUTATION", resource: "BankMutation", resourceId: mutationId });\n    return await unreconcileMutationService(mutationId, session?.user?.id);`
);

fs.writeFileSync(file, content);
console.log("Patched finance.ts");

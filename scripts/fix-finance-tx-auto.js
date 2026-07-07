const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // We need to inject FinanceTransaction creation whenever Kas Bank (Keluar) or Kas Bank (Masuk) is used.
  
  // 1. Purchase - DP / Partial (line 105 ish)
  const p1Search = /await tx\.journalEntry\.create\(\{ data: \{ description: \`Kas Bank \(Keluar DP\): \$\{reference\} \(\$\{party\}\)\`, amount: toPay as any, type: "CREDIT", accountId: bankAccount\.id, date: dpDate, createdById: userId \} \}\);/g;
  const p1Replace = `await tx.journalEntry.create({ data: { description: \`Kas Bank (Keluar DP): \${reference} (\${party})\`, amount: toPay as any, type: "CREDIT", accountId: bankAccount.id, date: dpDate, createdById: userId } });
                    await tx.financeTransaction.create({ data: { transactionType: "EXPENSE", bank: bankAccount.name, date: dpDate, referenceNumber: reference, description: \`Pembayaran DP Pembelian ke \${party}\`, amount: toPay as any, category: "PEMBELIAN", receiptNumber: reference, createdById: userId } });`;
  content = content.replace(p1Search, p1Replace);

  // 2. Purchase - Cash / PAID immediately
  const p2Search = /await tx\.journalEntry\.create\(\{ data: \{ description: \`Pembelian Tunai \(Bank\): \$\{reference\} \(\$\{party\}\)\`, amount: finalGrandTotal as any, type: "CREDIT", accountId: bankAccount\.id, date: payDate, createdById: userId \} \}\);/g;
  const p2Replace = `await tx.journalEntry.create({ data: { description: \`Pembelian Tunai (Bank): \${reference} (\${party})\`, amount: finalGrandTotal as any, type: "CREDIT", accountId: bankAccount.id, date: payDate, createdById: userId } });
                    await tx.financeTransaction.create({ data: { transactionType: "EXPENSE", bank: bankAccount.name, date: payDate, referenceNumber: reference, description: \`Pembayaran Lunas Pembelian ke \${party}\`, amount: finalGrandTotal as any, category: "PEMBELIAN", receiptNumber: reference, createdById: userId } });`;
  content = content.replace(p2Search, p2Replace);

  // 3. Purchase - Pay off CREDIT -> PAID or PARTIAL
  const p3Search = /await tx\.journalEntry\.create\(\{ data: \{ description: \`Kas Bank \(Keluar\): \$\{reference\} \(\$\{party\}\)\`, amount: toPay as any, type: "CREDIT", accountId: bankAccount\.id, date: activePayDate, createdById: userId \} \}\);/g;
  const p3Replace = `await tx.journalEntry.create({ data: { description: \`Kas Bank (Keluar): \${reference} (\${party})\`, amount: toPay as any, type: "CREDIT", accountId: bankAccount.id, date: activePayDate, createdById: userId } });
                    await tx.financeTransaction.create({ data: { transactionType: "EXPENSE", bank: bankAccount.name, date: activePayDate, referenceNumber: reference, description: \`Pelunasan Hutang ke \${party}\`, amount: toPay as any, category: "PEMBELIAN", receiptNumber: reference, createdById: userId } });`;
  content = content.replace(p3Search, p3Replace);

  // 4. Sales - DP / Partial
  const s1Search = /await tx\.journalEntry\.create\(\{ data: \{ description: \`Kas Bank \(Masuk DP\): \$\{reference\} \(\$\{party\}\)\`, amount: toPay as any, type: "DEBIT", accountId: bankAccount\.id, date: dpDate, createdById: userId \} \}\);/g;
  const s1Replace = `await tx.journalEntry.create({ data: { description: \`Kas Bank (Masuk DP): \${reference} (\${party})\`, amount: toPay as any, type: "DEBIT", accountId: bankAccount.id, date: dpDate, createdById: userId } });
                    await tx.financeTransaction.create({ data: { transactionType: "INCOME", bank: bankAccount.name, date: dpDate, referenceNumber: reference, description: \`Penerimaan DP Penjualan dari \${party}\`, amount: toPay as any, category: "PENJUALAN", invoiceNumber: reference, createdById: userId } });`;
  content = content.replace(s1Search, s1Replace);

  // 5. Sales - Cash / PAID immediately
  const s2Search = /await tx\.journalEntry\.create\(\{ data: \{ description: \`Penjualan Tunai \(Bank\): \$\{reference\} \(\$\{party\}\)\`, amount: finalGrandTotal as any, type: "DEBIT", accountId: bankAccount\.id, date: payDate, createdById: userId \} \}\);/g;
  const s2Replace = `await tx.journalEntry.create({ data: { description: \`Penjualan Tunai (Bank): \${reference} (\${party})\`, amount: finalGrandTotal as any, type: "DEBIT", accountId: bankAccount.id, date: payDate, createdById: userId } });
                    await tx.financeTransaction.create({ data: { transactionType: "INCOME", bank: bankAccount.name, date: payDate, referenceNumber: reference, description: \`Pelunasan Tunai Penjualan dari \${party}\`, amount: finalGrandTotal as any, category: "PENJUALAN", invoiceNumber: reference, createdById: userId } });`;
  content = content.replace(s2Search, s2Replace);

  // 6. Sales - Pay off CREDIT -> PAID or PARTIAL
  const s3Search = /await tx\.journalEntry\.create\(\{ data: \{ description: \`Kas Bank \(Masuk\): \$\{reference\} \(\$\{party\}\)\`, amount: toPay as any, type: "DEBIT", accountId: bankAccount\.id, date: activePayDate, createdById: userId \} \}\);/g;
  const s3Replace = `await tx.journalEntry.create({ data: { description: \`Kas Bank (Masuk): \${reference} (\${party})\`, amount: toPay as any, type: "DEBIT", accountId: bankAccount.id, date: activePayDate, createdById: userId } });
                    await tx.financeTransaction.create({ data: { transactionType: "INCOME", bank: bankAccount.name, date: activePayDate, referenceNumber: reference, description: \`Penerimaan Pelunasan Piutang dari \${party}\`, amount: toPay as any, category: "PENJUALAN", invoiceNumber: reference, createdById: userId } });`;
  content = content.replace(s3Search, s3Replace);

  fs.writeFileSync(filePath, content);
  console.log(`Updated finance-service.ts to auto-create FinanceTransactions`);
}

fixFile('src/lib/services/finance-service.ts');

const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const insertPoint = /export async function voidPaymentStatusService/g;
  
  const transferServiceCode = `export async function transferFundService(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description: string,
    date: Date,
    userId?: string
) {
    const { getPrisma } = require("@/lib/prisma");
    const prisma = getPrisma();

    if (fromAccountId === toAccountId) {
        throw new Error("Akun asal dan tujuan tidak boleh sama.");
    }

    if (amount <= 0) {
        throw new Error("Jumlah transfer harus lebih dari 0.");
    }

    return await prisma.$transaction(async (tx: any) => {
        // 1. Validate accounts
        const fromAcc = await tx.financeAccount.findUnique({ where: { id: fromAccountId } });
        const toAcc = await tx.financeAccount.findUnique({ where: { id: toAccountId } });

        if (!fromAcc || !toAcc) {
            throw new Error("Akun tidak ditemukan.");
        }

        // 2. Create Journal Entries
        // Debit to Destination (Uang Masuk)
        await tx.journalEntry.create({
            data: {
                description: \`Transfer Dana: \${description}\`,
                amount: amount,
                type: "DEBIT",
                accountId: toAcc.id,
                date: date,
                createdById: userId
            }
        });

        // Credit from Source (Uang Keluar)
        await tx.journalEntry.create({
            data: {
                description: \`Transfer Dana: \${description}\`,
                amount: amount,
                type: "CREDIT",
                accountId: fromAcc.id,
                date: date,
                createdById: userId
            }
        });

        // 3. Create Finance Transaction for traceability in Bank Mutations
        await tx.financeTransaction.create({
            data: {
                transactionType: "TRANSFER",
                bank: \`\${fromAcc.name} -> \${toAcc.name}\`,
                date: date,
                referenceNumber: \`TRF-\${Date.now()}\`,
                description: \`Pindah Dana: \${description}\`,
                amount: amount,
                category: "TRANSFER",
                createdById: userId
            }
        });

        return { success: true, message: "Transfer dana berhasil dicatat." };
    });
}

`;

  content = content.replace(insertPoint, transferServiceCode + "export async function voidPaymentStatusService");
  fs.writeFileSync(filePath, content);
  console.log(`Added transferFundService in ${filePath}`);
}

fixFile('src/lib/services/finance-service.ts');

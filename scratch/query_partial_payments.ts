import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const transactions = await prisma.financeTransaction.findMany({
    where: {
      invoiceNumber: { not: null }
    },
    select: {
      invoiceNumber: true,
      amount: true,
      date: true,
      description: true
    }
  });

  const paymentMap: Record<string, any[]> = {};
  for (const t of transactions) {
    if (!t.invoiceNumber) continue;
    if (!paymentMap[t.invoiceNumber]) {
      paymentMap[t.invoiceNumber] = [];
    }
    paymentMap[t.invoiceNumber].push(t);
  }

  console.log("=== TRANSAKSI DENGAN PEMBAYARAN TERPISAH (PARSIAL) ===");
  let count = 0;
  for (const [invoice, payments] of Object.entries(paymentMap)) {
    if (payments.length > 1) {
      count++;
      console.log(`\nInvoice/Ref: ${invoice}`);
      let total = 0;
      payments.forEach((p, i) => {
        const amt = Number(p.amount);
        total += amt;
        console.log(`  ${i+1}. ${p.date.toISOString().split('T')[0]} - Rp ${amt.toLocaleString('id-ID')}`);
      });
      console.log(`  TOTAL DIBAYAR: Rp ${total.toLocaleString('id-ID')}`);
    }
  }
  if (count === 0) {
    console.log("\nTidak ada transaksi dengan pembayaran terpisah/parsial yang ditemukan.");
  } else {
    console.log(`\nTotal ditemukan: ${count} transaksi.`);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

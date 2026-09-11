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

  let count = 0;
  for (const [invoice, payments] of Object.entries(paymentMap)) {
    if (payments.length > 1) {
      count++;
      let total = 0;
      payments.forEach((p, i) => {
        const amt = Number(p.amount);
        total += amt;
      });
    }
  }
  if (count === 0) {
  } else {
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const transactions = await prisma.financeTransaction.findMany({
    where: { invoiceNumber: { not: null } },
    select: { invoiceNumber: true, amount: true, date: true, description: true }
  });

  const paymentMap: Record<string, any[]> = {};
  for (const t of transactions) {
    if (!t.invoiceNumber) continue;
    if (!paymentMap[t.invoiceNumber]) paymentMap[t.invoiceNumber] = [];
    paymentMap[t.invoiceNumber].push(t);
  }

  let count = 0;
  let md = "# Daftar Transaksi Pembayaran Parsial (Dicicil)\n\nBerikut adalah daftar seluruh Nomor Ref/Invoice yang pembayarannya dilakukan secara bertahap:\n\n";

  md += "| No | Nomor Ref / Invoice | Total Pembayaran (Rp) | Detail Cicilan |\n";
  md += "|---|---|---|---|\n";

  for (const [invoice, payments] of Object.entries(paymentMap)) {
    if (payments.length > 1) {
      count++;
      let total = 0;
      let detailStr = "";
      payments.forEach((p: any, i: number) => {
        const amt = Number(p.amount);
        total += amt;
        const d = p.date.toISOString().split('T')[0];
        detailStr += `${i+1}. ${d} - Rp ${amt.toLocaleString('id-ID')}<br>`;
      });
      md += `| ${count} | ${invoice} | **${total.toLocaleString('id-ID')}** | ${detailStr} |\n`;
    }
  }

  fs.writeFileSync('.gemini/antigravity-ide/brain/19f82881-4b65-4058-91f9-bf2d4577bf29/laporan_pembayaran_parsial.md', md);
}
run().finally(() => prisma.$disconnect());

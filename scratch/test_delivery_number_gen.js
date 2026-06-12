const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const txDate = new Date();
  const day = String(txDate.getDate()).padStart(2, '0');
  const month = String(txDate.getMonth() + 1).padStart(2, '0');
  const year = txDate.getFullYear();
  const dateStr = `${day}${month}${year}`;

  console.log(`Checking sequence for date: ${dateStr}`);

  // Test the new logic
  const dayDeliveries = await prisma.salesDelivery.findMany({
    where: {
      deliveryNumber: {
        contains: `-${dateStr}-`
      }
    },
    select: { deliveryNumber: true }
  });

  console.log("Current deliveries for today:");
  dayDeliveries.forEach(d => console.log(` - ${d.deliveryNumber}`));

  let nextSeq = 1;
  if (dayDeliveries.length > 0) {
      const seqs = dayDeliveries
          .map((d) => {
              const parts = d.deliveryNumber.split('-');
              return parseInt(parts[parts.length - 1]);
          })
          .filter((seq) => !isNaN(seq));
      if (seqs.length > 0) {
          nextSeq = Math.max(...seqs) + 1;
      }
  }

  console.log(`\nComputed nextSeq: ${nextSeq}`);
  const nextSeqStr = String(nextSeq).padStart(3, '0');
  console.log(`Expected suffix: -${nextSeqStr}`);

  // Determine the random number (reuse if partial delivery under same invoice)
  // Let's test with the invoice from our problem order: KB-TRN-11062026-015
  const invoiceNumber = "KB-TRN-11062026-015";
  let randomNum = "";
  const existingDelivery = await prisma.salesDelivery.findFirst({
      where: { invoiceNumber: invoiceNumber },
      orderBy: { createdAt: 'asc' }
  });

  if (existingDelivery) {
      const parts = existingDelivery.deliveryNumber.split('-');
      randomNum = parts[1] || String(Math.floor(100 + Math.random() * 900));
      console.log(`Found existing delivery with same invoice. Reusing randomNum: ${randomNum}`);
  } else {
      randomNum = String(Math.floor(100 + Math.random() * 900));
      console.log(`No existing delivery found. Generated new randomNum: ${randomNum}`);
  }

  const generatedDeliveryNumber = `SJ-${randomNum}-${dateStr}-${nextSeqStr}`;
  console.log(`Generated Delivery Number: ${generatedDeliveryNumber}`);

  // Check if it already exists to guarantee it won't trigger unique constraint
  const exists = await prisma.salesDelivery.findUnique({
    where: { deliveryNumber: generatedDeliveryNumber }
  });
  if (exists) {
    console.error("ERROR: The generated delivery number ALREADY exists!");
  } else {
    console.log("SUCCESS: The generated delivery number is unique!");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

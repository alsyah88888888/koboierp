const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const products = await prisma.product.findMany();
  let valPF = 0, valBC = 0, valLain = 0;
  products.forEach(p => {
     const qty = p.stock || 0;
     const price = p.price || 0;
     const val = qty * price;
     if (p.name.includes('(PF)')) valPF += val;
     else if (p.name.includes('(BC)')) valBC += val;
     else valLain += val;
  });
  console.log(`PF: ${valPF}, BC: ${valBC}, Lain: ${valLain}`);
}
run();

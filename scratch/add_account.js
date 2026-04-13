const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const newAccount = await prisma.financeAccount.create({
    data: {
      code: '608',
      name: 'Biaya Inventaris',
      type: 'EXPENSE'
    }
  });
  console.log('Account added successfully:', JSON.stringify(newAccount, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

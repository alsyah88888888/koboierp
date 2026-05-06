
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.financeAccount.findFirst({
    where: { name: { contains: 'Maybank 736' } }
  });

  if (!existing) {
    const account = await prisma.financeAccount.create({
      data: {
        code: '110',
        name: 'Maybank 736',
        type: 'ASSET'
      }
    });
    console.log('Created account:', account);
  } else {
    console.log('Account already exists:', existing);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

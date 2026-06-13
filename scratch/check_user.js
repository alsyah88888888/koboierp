const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findUnique({where: {email: 'kusmawani@kolaborasi.id'}});
    console.log(user);
    await prisma.$disconnect();
}
main();

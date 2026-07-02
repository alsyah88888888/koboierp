import { getPrisma } from '../src/lib/prisma';
async function main() {
    const prisma = getPrisma();
    const tx = await prisma.financeTransaction.findMany({
        where: {
            OR: [
                { invoiceNumber: { contains: 'KB-TRN-02062026-001' } },
                { invoiceNumber: { contains: 'KB-TRN-02062026-002' } },
                { description: { contains: 'KB-TRN-02062026-001' } },
                { description: { contains: 'KB-TRN-02062026-002' } },
            ]
        }
    });
    console.log(JSON.stringify(tx, null, 2));
}
main().catch(console.error);

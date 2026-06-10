import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("=== SWAPPING LOT ALLOCATIONS IN DATABASE ===");

    // 1. Update first allocation
    // ID: cmq2a53ku01vsl1tn68q9ygv7 (from KB-TRN-04062026-003, qty 80)
    // Old Lot: LOT-BEVNESCAFE499-20260605-001 (cmq0oqjg4007pl1tnonmxc85m)
    // New Lot: LOT-BEVNESCAFE499-20260606-001 (cmq275nbg01ovl1tn2if3qtsf)
    const update1 = await prisma.lotAllocation.update({
        where: { id: "cmq2a53ku01vsl1tn68q9ygv7" },
        data: {
            lotId: "cmq275nbg01ovl1tn2if3qtsf",
            hppAtTime: 167660.764
        }
    });
    console.log("Updated allocation cmq2a53ku01vsl1tn68q9ygv7:", update1);

    // 2. Update second allocation
    // ID: cmq7ebzb8006dl1wlbl2ps20x (from KB-TRN-10062026-001, qty 80)
    // Old Lot: LOT-BEVNESCAFE499-20260606-001 (cmq275nbg01ovl1tn2if3qtsf)
    // New Lot: LOT-BEVNESCAFE499-20260605-001 (cmq0oqjg4007pl1tnonmxc85m)
    const update2 = await prisma.lotAllocation.update({
        where: { id: "cmq7ebzb8006dl1wlbl2ps20x" },
        data: {
            lotId: "cmq0oqjg4007pl1tnonmxc85m",
            hppAtTime: 106306.306
        }
    });
    console.log("Updated allocation cmq7ebzb8006dl1wlbl2ps20x:", update2);

    console.log("=== SWAP COMPLETED SUCCESSFULLY ===");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

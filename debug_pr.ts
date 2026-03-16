import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugPR() {
  console.log('--- Diagnostic: PR Approval Debug ---')
  
  try {
    const prNumber = 'PR-20260316-0002'
    const pr = await prisma.purchaseRequest.findUnique({
      where: { number: prNumber },
      include: { items: true }
    })
    
    if (!pr) {
      console.error(`PR ${prNumber} not found!`)
      return
    }
    
    console.log(`Found PR: ${pr.number} (ID: ${pr.id})`)
    console.log(`Current Status: ${pr.status}`)
    console.log('Items:', JSON.stringify(pr.items, null, 2))
    
    // Check for session/user logic
    // We'll simulate the updateData
    const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    })
    
    if (!adminUser) {
        console.error('No Admin user found in DB!')
        return
    }
    
    console.log(`Simulating approval by Admin: ${adminUser.name} (${adminUser.id})`)
    
    const updateData = {
        status: 'APPROVED_BY_ADMIN',
        approvedById: adminUser.id,
        approvedAt: new Date()
    }
    
    console.log('Attempting update...')
    await prisma.$transaction(async (tx) => {
        await tx.purchaseRequest.update({
            where: { id: pr.id },
            data: updateData
        })
    })
    
    console.log('✅ Update successful!')
    
    // Rollback for testing
    await prisma.purchaseRequest.update({
        where: { id: pr.id },
        data: {
            status: 'PENDING',
            approvedById: null,
            approvedAt: null
        }
    })
    console.log('Rolled back status to PENDING.')

  } catch (error) {
    console.error('❌ Error during PR update:', error)
  }
}

debugPR()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const insertPoint = /export async function updatePaymentStatusAction/g;
  
  const voidActionCode = `export async function voidPaymentStatusAction(
    type: "PURCHASE" | "SALE", 
    id: string
) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { voidPaymentStatusService } = require("@/lib/services/finance-service");
 
    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");
 
    if (session?.user?.role?.toUpperCase() !== "ADMIN" && session?.user?.role?.toUpperCase() !== "FINANCE") {
        throw new Error("Only Admin or Finance can void payments.");
    }

    return await voidPaymentStatusService(type, id, session.user.id);
}

`;

  content = content.replace(insertPoint, voidActionCode + "export async function updatePaymentStatusAction");
  fs.writeFileSync(filePath, content);
  console.log(`Added voidPaymentStatusAction in ${filePath}`);
}

fixFile('src/actions/finance.ts');

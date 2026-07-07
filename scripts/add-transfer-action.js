const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  const insertPoint = /export async function voidPaymentStatusAction/g;
  
  const transferActionCode = `export async function transferFundAction(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description: string,
    date: Date
) {
    const { getAuthOptions } = require("@/lib/auth");
    const { getServerSession } = require("next-auth");
    const { transferFundService } = require("@/lib/services/finance-service");
 
    const session = (await getServerSession(getAuthOptions())) as any;
    if (!session?.user?.id) throw new Error("Unauthorized");
 
    if (session?.user?.role?.toUpperCase() !== "ADMIN" && session?.user?.role?.toUpperCase() !== "FINANCE") {
        throw new Error("Only Admin or Finance can transfer funds.");
    }

    return await transferFundService(fromAccountId, toAccountId, amount, description, date, session.user.id);
}

`;

  content = content.replace(insertPoint, transferActionCode + "export async function voidPaymentStatusAction");
  fs.writeFileSync(filePath, content);
  console.log(`Added transferFundAction in ${filePath}`);
}

fixFile('src/actions/finance.ts');

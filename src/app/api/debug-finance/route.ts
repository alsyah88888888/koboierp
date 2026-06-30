import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const prisma = getPrisma();
        const errors: any[] = [];

        try { await prisma.bankMutation.findFirst(); } 
        catch (e: any) { errors.push({ query: "bankMutation", error: e.message }); }

        try { await prisma.journalEntry.findFirst({ include: { account: true, transaction: true } }); } 
        catch (e: any) { errors.push({ query: "journalEntry with account+transaction", error: e.message }); }

        try { await prisma.financeTransaction.findFirst(); } 
        catch (e: any) { errors.push({ query: "financeTransaction", error: e.message }); }

        return NextResponse.json({ ok: errors.length === 0, errors, timestamp: new Date().toISOString() });
    } catch (e: any) {
        return NextResponse.json({ ok: false, fatal: e.message }, { status: 500 });
    }
}

import { fixReceiptPrefixMigrationAction } from "@/app/actions";
import { NextResponse } from "next/server";

export async function GET() {
    // Temporary: No auth check for one-time migration
    try {
        const result = await fixReceiptPrefixMigrationAction();
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

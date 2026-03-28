import { fixReceiptPrefixMigrationAction } from "@/app/actions";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    // Only allow ADMIN to run this migration
    const session = await getServerSession(authOptions) as any;
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const result = await fixReceiptPrefixMigrationAction();
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

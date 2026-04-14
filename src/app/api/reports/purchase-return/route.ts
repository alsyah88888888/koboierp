import { NextRequest, NextResponse } from "next/server";
import { getPurchaseReturnsDetailService } from "@/lib/services/report-service";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(getAuthOptions());
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const data = await getPurchaseReturnsDetailService();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[API_PURCHASE_RETURN] Error:", error);
        return NextResponse.json({ error: "Gagal menarik data retur pembelia" }, { status: 500 });
    }
}

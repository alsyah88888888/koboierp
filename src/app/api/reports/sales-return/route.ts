import { NextRequest, NextResponse } from "next/server";
import { getSalesReturnsDetailService } from "@/lib/services/report-service";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(getAuthOptions());
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const data = await getSalesReturnsDetailService();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[API_SALES_RETURN] Error:", error);
        return NextResponse.json({ error: "Gagal menarik data retur penjualan" }, { status: 500 });
    }
}

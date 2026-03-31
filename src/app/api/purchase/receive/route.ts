import { NextResponse } from "next/server";
import { receivePurchaseOrder } from "@/modules/purchase/purchase.service";

/**
 * POST /api/purchase/receive
 * Body: { poId: string, warehouseId: string }
 */
export async function POST(req: Request) {
    try {
        const { poId, warehouseId } = await req.json();

        if (!poId || !warehouseId) {
            return NextResponse.json(
                { error: "poId and warehouseId are required" },
                { status: 400 }
            );
        }

        const updatedPO = await receivePurchaseOrder(poId, warehouseId);

        return NextResponse.json({
            message: "PO successfully received and stock updated",
            data: updatedPO
        });
    } catch (error: any) {
        console.error("[RECEIVE_PO_ERROR]", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

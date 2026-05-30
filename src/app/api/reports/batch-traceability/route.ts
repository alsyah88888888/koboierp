import { NextRequest, NextResponse } from "next/server";
import { getBatchTraceabilityService } from "@/lib/services/report-service";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

/**
 * BATCH TRACEABILITY REPORT — API Route
 * GET /api/reports/batch-traceability
 * Query params:
 *   month    - angka bulan (1-12), default bulan ini
 *   year     - tahun 4 digit, default tahun ini
 *   status   - AKTIF | HABIS | VOID | ALL (default ALL)
 *   sku      - filter partial SKU produk
 *   supplier - filter partial nama supplier
 *
 * Akses: ADMIN, PURCHASE, FINANCE
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions());

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as any)?.role?.toUpperCase() ?? "";
        const allowedRoles = ["ADMIN", "PURCHASE", "FINANCE"];

        if (!allowedRoles.includes(userRole)) {
            return NextResponse.json(
                { error: "Forbidden: Akses ditolak untuk role ini" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const month    = searchParams.get("month")    ? parseInt(searchParams.get("month")!)    : undefined;
        const year     = searchParams.get("year")     ? parseInt(searchParams.get("year")!)     : undefined;
        const status   = searchParams.get("status")   || "ALL";
        const sku      = searchParams.get("sku")      || undefined;
        const supplier = searchParams.get("supplier") || undefined;

        console.log(`[API_BATCH_TRACEABILITY] Request — Month: ${month}, Year: ${year}, Status: ${status}, SKU: ${sku}, Supplier: ${supplier}`);

        const data = await getBatchTraceabilityService({ month, year, status, sku, supplier });

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("[API_BATCH_TRACEABILITY] FATAL ERROR:", error);
        return NextResponse.json(
            { error: "Gagal menarik data batch traceability", details: error.message },
            { status: 500 }
        );
    }
}

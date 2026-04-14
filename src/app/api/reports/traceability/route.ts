import { NextRequest, NextResponse } from "next/server";
import { getProductTraceabilityService } from "@/lib/services/report-service";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

/**
 * RELIABLE EXPORT API
 * Standard HTTP GET endpoint for large data traceability reports.
 * Bypasses Server Action serialization limits.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions());
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const monthNum = searchParams.get("month");
        const yearNum = searchParams.get("year");

        const month = monthNum ? parseInt(monthNum) : undefined;
        const year = yearNum ? parseInt(yearNum) : undefined;

        console.log(`[API_TRACEABILITY] Fetching report for Month: ${month}, Year: ${year}`);
        
        const data = await getProductTraceabilityService(month, year);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("[API_TRACEABILITY] FATAL ERROR:", error);
        return NextResponse.json({ 
            error: "Gagal menarik data", 
            details: error.message 
        }, { status: 500 });
    }
}

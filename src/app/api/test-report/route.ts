import { NextResponse } from "next/server";
import { getMonthlyClosingReportService } from "@/lib/services/report-service";

export async function GET() {
    try {
        console.log("API TEST: Fetching January 2026 Report...");
        const data = await getMonthlyClosingReportService(1, 2026);
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message });
    }
}

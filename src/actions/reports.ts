"use server";

import { revalidatePath } from "next/cache";
import { getProductTraceabilityService } from "@/lib/services/report-service";
import {
    getComprehensiveDailyReportService,
    getComprehensiveWeeklyReportService,
    getComprehensiveMonthlyReportService
} from "@/lib/services/report-service";
import { serializeDecimal } from "@/lib/utils";

export async function getProductTraceabilityAction(month?: number, year?: number, prefix?: 'PF' | 'BC' | 'ALL') {
    try {
        return await getProductTraceabilityService(month, year, prefix);
    } catch (error: any) {
        console.error("[getProductTraceabilityAction] Error:", error);
        throw error;
    }
}

export async function getComprehensiveDailyReportAction(date?: string, prefix?: 'PF' | 'BC' | 'ALL') {
    try {
        const result = await getComprehensiveDailyReportService(date, prefix);
        return serializeDecimal(result);
    } catch (error: any) {
        console.error("[getComprehensiveDailyReportAction] Error:", error);
        return { error: error.message || "Failed to generate daily report" };
    }
}

export async function getComprehensiveWeeklyReportAction(weekStartDate?: string, prefix?: 'PF' | 'BC' | 'ALL') {
    try {
        const result = await getComprehensiveWeeklyReportService(weekStartDate, prefix);
        return serializeDecimal(result);
    } catch (error: any) {
        console.error("[getComprehensiveWeeklyReportAction] Error:", error);
        return { error: error.message || "Failed to generate weekly report" };
    }
}

export async function getComprehensiveMonthlyReportAction(month?: number, year?: number, prefix?: 'PF' | 'BC' | 'ALL') {
    try {
        const result = await getComprehensiveMonthlyReportService(month, year, prefix);
        return serializeDecimal(result);
    } catch (error: any) {
        console.error("[getComprehensiveMonthlyReportAction] Error:", error);
        return { error: error.message || "Failed to generate monthly report" };
    }
}

export async function reallocateLotAction(sdItemId: string, newLotId: string) {
    try {
        const { reallocateLotService } = await import('@/lib/services/report-service');
        await reallocateLotService(sdItemId, newLotId);
        revalidatePath('/reports');
        return { success: true };
    } catch (e: any) {
        return { error: e.message || 'Failed to reallocate lot' };
    }
}

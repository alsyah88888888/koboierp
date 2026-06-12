"use server";

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

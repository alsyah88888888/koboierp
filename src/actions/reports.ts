"use server";

import { getProductTraceabilityService } from "@/lib/services/report-service";

export async function getProductTraceabilityAction(month?: number, year?: number) {
    try {
        return await getProductTraceabilityService(month, year);
    } catch (error: any) {
        console.error("[getProductTraceabilityAction] Error:", error);
        throw error;
    }
}

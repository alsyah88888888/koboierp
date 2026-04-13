"use server";

import { getProductTraceabilityService } from "@/lib/services/report-service";

export async function getProductTraceabilityAction() {
    try {
        return await getProductTraceabilityService();
    } catch (error: any) {
        console.error("[getProductTraceabilityAction] Error:", error);
        throw error;
    }
}

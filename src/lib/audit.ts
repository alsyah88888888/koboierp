import { getPrisma } from "./prisma";
import { headers } from "next/headers";

export async function logAction(params: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
}) {
    const prisma = getPrisma();
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for") || "unknown";
    const userAgent = headerList.get("user-agent") || "unknown";

    try {
        await prisma.auditLog.create({
            data: {
                userId: params.userId,
                action: params.action,
                resource: params.resource,
                resourceId: params.resourceId,
                details: params.details || {},
                ipAddress: ip,
                userAgent: userAgent,
            },
        });
    } catch (error) {
        console.error("[AuditLog] Failed to create log:", error);
    }
}

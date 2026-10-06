"use server";

import { getPrisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DEFAULT_CMS_ITEMS, CmsItem, parseCmsSteps } from "@/lib/cms-defaults";

/**
 * Get active CMS contents for public/dashboard display
 */
export async function getCmsContentsAction(): Promise<CmsItem[]> {
    const prisma = getPrisma();
    try {
        const rows = await (prisma as any).cmsContent.findMany({
            where: { isActive: true },
            orderBy: [
                { isPinned: "desc" },
                { priority: "desc" },
                { createdAt: "desc" }
            ]
        });

        if (!rows || rows.length === 0) {
            // Seed defaults into database in background so admin can immediately edit them
            seedDefaultsIfEmpty().catch(console.error);
            return DEFAULT_CMS_ITEMS.map(item => ({
                ...item,
                parsedSteps: parseCmsSteps(item.steps)
            }));
        }

        return rows.map((r: any) => ({
            id: r.id,
            title: r.title,
            category: r.category,
            summary: r.summary,
            content: r.content,
            steps: r.steps,
            parsedSteps: parseCmsSteps(r.steps),
            linkUrl: r.linkUrl,
            linkText: r.linkText,
            badge: r.badge,
            colorTheme: r.colorTheme || "indigo",
            icon: r.icon || "Truck",
            priority: r.priority,
            isPinned: r.isPinned,
            isActive: r.isActive,
            targetRole: r.targetRole || "ALL",
            createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
            updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined
        }));
    } catch (err: any) {
        console.warn("CMS Content table not yet created or error fetching, using defaults:", err?.message || err);
        return DEFAULT_CMS_ITEMS.map(item => ({
            ...item,
            parsedSteps: parseCmsSteps(item.steps)
        }));
    }
}

/**
 * Get all CMS contents (including inactive) for Admin Management Modal
 */
export async function getAllCmsContentsForAdminAction(): Promise<CmsItem[]> {
    const prisma = getPrisma();
    try {
        let rows = await (prisma as any).cmsContent.findMany({
            orderBy: [
                { isPinned: "desc" },
                { priority: "desc" },
                { createdAt: "desc" }
            ]
        });

        if (!rows || rows.length === 0) {
            await seedDefaultsIfEmpty();
            rows = await (prisma as any).cmsContent.findMany({
                orderBy: [
                    { isPinned: "desc" },
                    { priority: "desc" },
                    { createdAt: "desc" }
                ]
            });
        }

        return rows.map((r: any) => ({
            id: r.id,
            title: r.title,
            category: r.category,
            summary: r.summary,
            content: r.content,
            steps: r.steps,
            parsedSteps: parseCmsSteps(r.steps),
            linkUrl: r.linkUrl,
            linkText: r.linkText,
            badge: r.badge,
            colorTheme: r.colorTheme || "indigo",
            icon: r.icon || "Truck",
            priority: r.priority,
            isPinned: r.isPinned,
            isActive: r.isActive,
            targetRole: r.targetRole || "ALL",
            createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
            updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined
        }));
    } catch (err: any) {
        console.error("Error fetching all CMS contents:", err);
        return DEFAULT_CMS_ITEMS.map(item => ({
            ...item,
            parsedSteps: parseCmsSteps(item.steps)
        }));
    }
}

/**
 * Seed defaults into DB if table is empty
 */
async function seedDefaultsIfEmpty() {
    const prisma = getPrisma();
    try {
        const count = await (prisma as any).cmsContent.count();
        if (count === 0) {
            for (const item of DEFAULT_CMS_ITEMS) {
                await (prisma as any).cmsContent.create({
                    data: {
                        title: item.title,
                        category: item.category,
                        summary: item.summary,
                        content: item.content,
                        steps: item.steps,
                        linkUrl: item.linkUrl,
                        linkText: item.linkText,
                        badge: item.badge,
                        colorTheme: item.colorTheme,
                        icon: item.icon,
                        priority: item.priority,
                        isPinned: item.isPinned,
                        isActive: item.isActive,
                        targetRole: item.targetRole
                    }
                });
            }
        }
    } catch (err) {
        console.warn("Could not seed defaults:", err);
    }
}

/**
 * Create new CMS content
 */
export async function createCmsContentAction(input: {
    title: string;
    category: string;
    summary?: string;
    content: string;
    steps?: string;
    linkUrl?: string;
    linkText?: string;
    badge?: string;
    colorTheme?: string;
    icon?: string;
    priority?: number;
    isPinned?: boolean;
    isActive?: boolean;
    targetRole?: string;
}) {
    const prisma = getPrisma();
    try {
        const created = await (prisma as any).cmsContent.create({
            data: {
                title: input.title.trim(),
                category: input.category || "FLOW_KEGIATAN",
                summary: input.summary?.trim() || null,
                content: input.content.trim(),
                steps: input.steps?.trim() || null,
                linkUrl: input.linkUrl?.trim() || null,
                linkText: input.linkText?.trim() || null,
                badge: input.badge?.trim() || null,
                colorTheme: input.colorTheme || "indigo",
                icon: input.icon || "Truck",
                priority: Number(input.priority) || 0,
                isPinned: Boolean(input.isPinned),
                isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
                targetRole: input.targetRole || "ALL"
            }
        });

        revalidatePath("/");
        return { success: true, item: created };
    } catch (err: any) {
        console.error("Gagal membuat konten CMS:", err);
        return { success: false, error: err.message || String(err) };
    }
}

/**
 * Update existing CMS content
 */
export async function updateCmsContentAction(
    id: string,
    input: {
        title?: string;
        category?: string;
        summary?: string;
        content?: string;
        steps?: string;
        linkUrl?: string;
        linkText?: string;
        badge?: string;
        colorTheme?: string;
        icon?: string;
        priority?: number;
        isPinned?: boolean;
        isActive?: boolean;
        targetRole?: string;
    }
) {
    const prisma = getPrisma();
    try {
        const updated = await (prisma as any).cmsContent.update({
            where: { id },
            data: {
                ...(input.title !== undefined && { title: input.title.trim() }),
                ...(input.category !== undefined && { category: input.category }),
                ...(input.summary !== undefined && { summary: input.summary?.trim() || null }),
                ...(input.content !== undefined && { content: input.content.trim() }),
                ...(input.steps !== undefined && { steps: input.steps?.trim() || null }),
                ...(input.linkUrl !== undefined && { linkUrl: input.linkUrl?.trim() || null }),
                ...(input.linkText !== undefined && { linkText: input.linkText?.trim() || null }),
                ...(input.badge !== undefined && { badge: input.badge?.trim() || null }),
                ...(input.colorTheme !== undefined && { colorTheme: input.colorTheme }),
                ...(input.icon !== undefined && { icon: input.icon }),
                ...(input.priority !== undefined && { priority: Number(input.priority) || 0 }),
                ...(input.isPinned !== undefined && { isPinned: Boolean(input.isPinned) }),
                ...(input.isActive !== undefined && { isActive: Boolean(input.isActive) }),
                ...(input.targetRole !== undefined && { targetRole: input.targetRole || "ALL" })
            }
        });

        revalidatePath("/");
        return { success: true, item: updated };
    } catch (err: any) {
        console.error("Gagal mengupdate konten CMS:", err);
        return { success: false, error: err.message || String(err) };
    }
}

/**
 * Delete CMS content
 */
export async function deleteCmsContentAction(id: string) {
    const prisma = getPrisma();
    try {
        await (prisma as any).cmsContent.delete({
            where: { id }
        });
        revalidatePath("/");
        return { success: true };
    } catch (err: any) {
        console.error("Gagal menghapus konten CMS:", err);
        return { success: false, error: err.message || String(err) };
    }
}

/**
 * Toggle active state of CMS content
 */
export async function toggleCmsContentActiveAction(id: string) {
    const prisma = getPrisma();
    try {
        const existing = await (prisma as any).cmsContent.findUnique({
            where: { id }
        });
        if (!existing) return { success: false, error: "Konten tidak ditemukan" };

        const updated = await (prisma as any).cmsContent.update({
            where: { id },
            data: { isActive: !existing.isActive }
        });

        revalidatePath("/");
        return { success: true, isActive: updated.isActive };
    } catch (err: any) {
        console.error("Gagal toggle status konten CMS:", err);
        return { success: false, error: err.message || String(err) };
    }
}

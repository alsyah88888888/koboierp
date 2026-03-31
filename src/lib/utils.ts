import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
    // Manually handle hydration-safe currency formatting
    const formatted = new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    return `Rp ${formatted}`;
}

export function formatNumber(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount).replace(/\u00A0/g, " ");
}

/**
 * Serialize Prisma Decimal objects to plain numbers/objects for Client Components
 */
export function serializeDecimal(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(serializeDecimal);
    }

    // Handle objects
    if (typeof obj === 'object') {
        // Handle Date objects - RSC usually handles this but sometimes they can be tricky
        // Keeping as is unless it's a known issue, but let's focus on Decimal
        if (obj instanceof Date) return obj;

        // More robust Decimal check (decimal.js pattern used by Prisma)
        // obj.e can be 0, so we must check for existence/type, not truthiness
        if (
            (obj.d && Array.isArray(obj.d) && typeof obj.s === 'number' && typeof obj.e === 'number') ||
            (obj.constructor && (obj.constructor.name === 'Decimal' || obj.constructor.name === 'i')) ||
            (typeof obj.toNumber === 'function')
        ) {
            return Number(obj);
        }

        // Handle nested objects
        const newObj: any = {};
        for (const [key, value] of Object.entries(obj)) {
            newObj[key] = serializeDecimal(value);
        }
        return newObj;
    }

    return obj;
}

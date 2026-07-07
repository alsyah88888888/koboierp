import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
    // Tampilkan desimal sesuai dengan aslinya (dinamis)
    const formatted = new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 10,
    }).format(Math.abs(amount));
    const sign = amount < 0 ? "-" : "";
    return `${sign}Rp ${formatted}`;
}

export function formatNumber(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.round(amount)).replace(/\u00A0/g, " ");
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
        // Skip Date objects
        if (obj instanceof Date) return obj;

        // Check for Decimal-like structures/classes
        const isDecimal =
            (obj.constructor && (obj.constructor.name === 'Decimal' || obj.constructor.name === 'i')) ||
            (typeof obj.toNumber === 'function') ||
            (obj.d && Array.isArray(obj.d) && typeof obj.s === 'number' && typeof obj.e === 'number');

        if (isDecimal) {
            try {
                const val = Number(obj);
                // Ensure it's effectively a finite number
                return isFinite(val) ? val : String(obj);
            } catch (e) {
                return String(obj);
            }
        }

        // Handle normal objects (and class instances not identified as Decimal)
        const newObj: any = {};
        for (const [key, value] of Object.entries(obj)) {
            newObj[key] = serializeDecimal(value);
        }
        return newObj;
    }

    return obj;
}

export function formatDate(date: Date | string) {
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(new Date(date));
}

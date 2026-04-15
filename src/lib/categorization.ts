export const CATEGORY_OPTIONS = [
    { label: "Food", value: "FOOD", prefix: "FOO" },
    { label: "Beverage", value: "BEVERAGE", prefix: "BEV" },
    { label: "Home Care", value: "HOME CARE", prefix: "HOM" },
    { label: "Personal Care", value: "PERSONAL CARE", prefix: "PER" },
    { label: "Office", value: "OFFICE", prefix: "OFF" },
    { label: "Medicine", value: "MEDICINE", prefix: "MED" },
    { label: "Umum", value: "UMUM", prefix: "GEN" }
];

export const CATEGORY_MAP: Record<string, string> = {
    "BEV": "BEVERAGE",
    "FOO": "FOOD",
    "HOM": "HOME CARE",
    "PER": "PERSONAL CARE",
    "OFF": "OFFICE",
    "MED": "MEDICINE",
};

export function generateSkuFromCategory(name: string, category: string, currentSku: string = "") {
    const cat = CATEGORY_OPTIONS.find(c => c.value === category);
    if (!cat) return currentSku;

    const prefix = cat.prefix;
    
    // Clean name: Uppercase, alphanumeric only, max 10 chars
    const cleanedName = name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 10);

    // If existing SKU starts with another category's prefix, replace it
    for (const option of CATEGORY_OPTIONS) {
        if (currentSku.startsWith(option.prefix)) {
            return currentSku.replace(option.prefix, prefix);
        }
    }

    // Default: Combine prefix + cleaned name + random suffix if needed
    // But per user request, just prefixing name is usually what they want
    if (!currentSku || currentSku === "FOO" || currentSku === "BEV" || currentSku === "HOM" || currentSku === "PER") {
        return `${prefix}${cleanedName}`;
    }

    // If SKU is already manual and from user, just prepend if not there
    if (!currentSku.startsWith(prefix)) {
        return `${prefix}${currentSku}`;
    }

    return currentSku;
}

export const KEYWORD_MAP: Record<string, string> = {
    "sprite": "BEVERAGE",
    "drink": "BEVERAGE",
    "water": "BEVERAGE",
    "coca": "BEVERAGE",
    "fanta": "BEVERAGE",
    "kecap": "FOOD",
    "sambal": "FOOD",
    "snack": "FOOD",
    "mie": "FOOD",
    "indomie": "FOOD",
    "biskuit": "FOOD",
    "attack": "HOME CARE",
    "rinso": "HOME CARE",
    "baygon": "HOME CARE",
    "detergen": "HOME CARE",
    "sabun": "PERSONAL CARE",
    "shampoo": "PERSONAL CARE",
    "biore": "PERSONAL CARE",
    "odol": "PERSONAL CARE",
    "kertas": "OFFICE",
    "buku": "OFFICE",
    "bolpen": "OFFICE",
    "obat": "MEDICINE",
    "panadol": "MEDICINE",
};

export function getSuggestedCategory(name: string, sku: string): string | null {
    // 1. Check SKU Prefix (3-4 chars before first dash)
    const skuPrefix = sku.substring(0, 3).toUpperCase();
    if (CATEGORY_MAP[skuPrefix]) return CATEGORY_MAP[skuPrefix];

    // 2. Check Keywords in Name
    const lowerName = name.toLowerCase();
    for (const [keyword, category] of Object.entries(KEYWORD_MAP)) {
        if (lowerName.includes(keyword)) return category;
    }

    return null;
}

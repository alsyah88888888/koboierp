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
    
    // Clean name: Uppercase, alphanumeric only
    const cleanedName = name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 3); // Take first 3 characters

    // Generate 3 random digits
    const randomSuffix = Math.floor(100 + Math.random() * 900);

    // If existing SKU starts with another category's prefix, replace it
    for (const option of CATEGORY_OPTIONS) {
        if (currentSku.startsWith(option.prefix)) {
            // Keep the suffix if it already has a dash and 3 digits
            const parts = currentSku.split("-");
            const existingSuffix = parts.length > 1 && parts[1].length === 3 ? parts[1] : randomSuffix;
            return `${prefix}${cleanedName}-${existingSuffix}`;
        }
    }

    // Default: Combine prefix + 3 chars name + dash + 3 random digits
    return `${prefix}${cleanedName}-${randomSuffix}`;
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

export const CATEGORY_MAP: Record<string, string> = {
    "BEV": "BEVERAGE",
    "FOO": "FOOD",
    "HOM": "HOME CARE",
    "PER": "PERSONAL CARE",
    "OFF": "OFFICE",
    "MED": "MEDICINE",
};

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
    const skuPrefix = sku.split("-")[0].toUpperCase();
    if (CATEGORY_MAP[skuPrefix]) return CATEGORY_MAP[skuPrefix];

    // 2. Check Keywords in Name
    const lowerName = name.toLowerCase();
    for (const [keyword, category] of Object.entries(KEYWORD_MAP)) {
        if (lowerName.includes(keyword)) return category;
    }

    return null;
}

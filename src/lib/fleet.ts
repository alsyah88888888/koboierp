export interface FleetDriver {
    driver: string;
    plate: string;
    etoll: string;
    alias?: string[];
}

export const OFFICIAL_FLEET: FleetDriver[] = [
    {
        driver: "KARNO",
        plate: "F 8840 GY",
        etoll: "0145 0084 0251 7303",
        alias: ["KARNO", "F 8840 GY", "F 8440 GY", "F 8840 GY - KARNO"]
    },
    {
        driver: "KUSWARA",
        plate: "B 9198 FCM",
        etoll: "0145 0084 0251 7261",
        alias: ["KUSWARA", "B 9198 FCM", "B 9198 FCM - KUSWARA"]
    },
    {
        driver: "RAHMAT. H",
        plate: "F 8744 MA",
        etoll: "0145 0084 0251 7279",
        alias: ["RAHMAT. H", "RAHMAT H", "RAHMAT", "F 8744 MA", "F 8744 MA - RAHMAT. H", "F 8744 MA - RAHMAT/IMAM"]
    },
    {
        driver: "CARSIKA",
        plate: "F 8065 HI",
        etoll: "0145 0084 0251 7287",
        alias: ["CARSIKA", "F 8065 HI", "F 8065 HI - CARSIKA", "F 8065 HI - ROHMAN/YADI"]
    },
    {
        driver: "HERU",
        plate: "B 9918 TIT",
        etoll: "0145 0084 0251 7295",
        alias: ["HERU", "B 9918 TIT", "B 9918 TIT - HERU", "B 9918 TIT - HERU/TATANG"]
    }
];

export function getFleetByDriverOrPlate(input: string): FleetDriver | undefined {
    if (!input) return undefined;
    const clean = input.trim().toUpperCase();
    return OFFICIAL_FLEET.find(f => {
        if (f.driver.toUpperCase() === clean || f.plate.toUpperCase() === clean) return true;
        if (f.alias?.some(a => a.toUpperCase() === clean)) return true;
        // Clean spaces comparison for plate
        const compactPlate = f.plate.replace(/\s+/g, "");
        const compactClean = clean.replace(/\s+/g, "");
        if (compactClean.includes(compactPlate) || compactClean.includes(f.driver.toUpperCase())) return true;
        return false;
    });
}

async function run() {
    const items = [
        { q: 10, p: 663340.54 },
        { q: 10, p: 663340.54 },
        { q: 2, p: 663340.54 },
        { q: 2, p: 431464.864 },
        { q: 10, p: 663340.54 },
        { q: 2, p: 663340.54 },
        { q: 10, p: 663339 },
        { q: 20, p: 778789.189 },
        { q: 20, p: 778789.189 },
        { q: 10, p: 431464.864 },
        { q: 5, p: 431464.864 },
        { q: 5, p: 431464.864 },
        { q: 8, p: 431464.864 },
        { q: 10, p: 431464.864 },
    ];

    let subtotal1 = 0; // exact decimals
    let subtotal2 = 0; // rounded per line
    let subtotal3 = 0; // rounded price per line
    
    items.forEach(i => {
        subtotal1 += i.q * i.p;
        subtotal2 += Math.round(i.q * i.p);
        subtotal3 += i.q * Math.round(i.p);
    });

    console.log(`Subtotal 1 (Exact): ${subtotal1}`);
    console.log(`Subtotal 2 (Rounded line): ${subtotal2}`);
    console.log(`Subtotal 3 (Rounded price): ${subtotal3}`);

    const calcTax = (dpp: number) => {
        const dppNilaiLain = Math.round(dpp * 0.916666666666667);
        const tax = Math.round(dppNilaiLain * 0.12);
        return { dppNilaiLain, tax, grandTotal: Math.round(dpp + tax) };
    }

    console.log('--- EXECUTING CALCULATIONS ---');
    console.log('Method 1 (Exact):', calcTax(Math.round(subtotal1)));
    console.log('Method 2 (Rounded line):', calcTax(subtotal2));
    console.log('Method 3 (Rounded price):', calcTax(subtotal3));
}

run();

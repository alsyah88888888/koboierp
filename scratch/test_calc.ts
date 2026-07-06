const isPKP = true;
const isInputIncludePPN = true;

const items = [
    { quantity: 10, salesPrice: 1000, discount: 0 }
];

const getActualPrice = (p: number) => {
    return (isPKP && isInputIncludePPN) ? (p / 1.11) : p;
};

const grossAmount = items.reduce((sum, item) => {
    const q = Number(item.quantity);
    const p = Number(item.salesPrice);
    return sum + (q * getActualPrice(p));
}, 0);

const totalItemDiscounts = items.reduce((sum, item) => {
    return sum + Number(item.discount || 0);
}, 0);

const subtotal = grossAmount - totalItemDiscounts;
const totalDiscountNominal = 0;
const dpp = subtotal - totalDiscountNominal;
const taxRatePercent = 12;

let dppNilaiLain = 0;
let taxAmount = 0;
if (taxRatePercent === 12) {
    dppNilaiLain = dpp * (11/12);
    taxAmount = dppNilaiLain * 0.12;
} else if (taxRatePercent > 0) {
    taxAmount = dpp * (taxRatePercent / 100);
}

const grandTotal = Math.round(dpp + taxAmount);

console.log({
    "Gross Amount": Math.round(grossAmount),
    "DPP": Math.round(dpp),
    "DPP Nilai Lain": Math.round(dppNilaiLain),
    "Tax Amount (PPN)": Math.round(taxAmount),
    "Grand Total": grandTotal
});

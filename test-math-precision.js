const salesPrice = 124000 / 1.11; // 111711.7117117117
const qty = 213;

const subtotalExact = qty * salesPrice; // 23794594.59459459
const exactDpp = subtotalExact;
const exactDppNilaiLain = exactDpp * (11 / 12);
const exactTaxAmount = exactDppNilaiLain * 0.12;

const grandTotal = Math.round(exactDpp + exactTaxAmount);
console.log({
  salesPrice, subtotalExact, exactDpp, exactDppNilaiLain, exactTaxAmount, grandTotal
});

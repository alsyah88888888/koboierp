const sellPrice = 216216.216;
const qty = 2000;
const allocItemDiscount = 0;
const sellLineSubtotal = (sellPrice * qty) - allocItemDiscount;

const sdSubtotal = 432432.432;
const sdHeaderDiscount = 0;
const sdDiscountShare = sdSubtotal > 0 ? Math.round(sdHeaderDiscount * (sellLineSubtotal / sdSubtotal)) : 0;

let totalJual = sellLineSubtotal - sdDiscountShare;
console.log("totalJual before tax:", totalJual);

const taxRate = 11 / 100;
totalJual = totalJual * (1 + taxRate);
console.log("totalJual after tax:", totalJual);
console.log("Math.round:", Math.round(totalJual));


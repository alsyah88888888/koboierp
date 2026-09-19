const r = {
  items: [
    { itemName: 'Penambahan Daya Listrik ', quantity: 1, estimatedPrice: 2900000 }
  ]
};
const data = [];
r.items.forEach((i) => {
    data.push({
        'Qty': i.quantity,
        'Estimasi Harga': Number(i.estimatedPrice),
        'Total Estimasi': i.quantity * Number(i.estimatedPrice)
    });
});
console.log(data);

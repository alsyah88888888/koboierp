"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateProductTraceabilityInternal = calculateProductTraceabilityInternal;
exports.getProductTraceabilityService = getProductTraceabilityService;
exports.getMonthlyClosingReportService = getMonthlyClosingReportService;
exports.getPurchaseReturnsDetailService = getPurchaseReturnsDetailService;
exports.getSalesReturnsDetailService = getSalesReturnsDetailService;
exports.getBatchTraceabilityService = getBatchTraceabilityService;
exports.getComprehensiveDailyReportService = getComprehensiveDailyReportService;
exports.getComprehensiveWeeklyReportService = getComprehensiveWeeklyReportService;
exports.getComprehensiveMonthlyReportService = getComprehensiveMonthlyReportService;
exports.reallocateLotService = reallocateLotService;
exports.getCrossDivisionSalesService = getCrossDivisionSalesService;
exports.autoFixCrossTransactionService = autoFixCrossTransactionService;
var prisma_1 = require("@/lib/prisma");
/**
 * FIFO TRACEABILITY SERVICE — v4 (Format Spreadsheet)
 * Kolom disesuaikan persis dengan format gambar referensi:
 * NO | TANGGAL | F.PAJAK | NOMOR | TANGGAL(beli) | NAMA PEMBELI | BARCODE |
 * KETERANGAN ITEM | SALES | [BELI: QTY/HARGA/OPS/TOTAL] | [JUAL: NAMA/QTY/HARGA/TOTAL] |
 */
function calculateProductTraceabilityInternal(startDate, endDate, prefix) {
    return __awaiter(this, void 0, void 0, function () {
        /**
         * SMART MATCHING: Find the best GR for a given sale item
         * Scoring: date proximity (closer = better) + price consistency (closer to median = better)
         * Filters out price anomalies (>5x or <0.2x median price)
         */
        function findBestGR(productId, saleDate, saleQty) {
            var candidates = grItemsByProduct_2.get(productId);
            if (!candidates || candidates.length === 0)
                return null;
            var medianPrice = medianPriceByProduct_1.get(productId) || 0;
            var saleDateMs = saleDate.getTime();
            var bestScore = -Infinity;
            var bestGR = null;
            for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
                var gr = candidates_1[_i];
                var grDate = gr.receipt.date;
                if (!grDate)
                    continue;
                var grPrice = Number(gr.purchasePrice);
                // Score 1: Date proximity (prefer purchases BEFORE or ON sale date, penalize future purchases less)
                var daysDiff = Math.abs(saleDateMs - grDate.getTime()) / (1000 * 60 * 60 * 24);
                var saleDateDay = new Date(saleDate);
                saleDateDay.setHours(0, 0, 0, 0);
                var grDateDay = new Date(grDate);
                grDateDay.setHours(0, 0, 0, 0);
                var isBeforeSale = grDateDay.getTime() <= saleDateDay.getTime();
                var dateScore = isBeforeSale
                    ? Math.max(0, 100 - daysDiff * 0.5) // Purchases before sale: slight decay
                    : Math.max(0, 50 - daysDiff * 2); // Purchases after sale: heavier penalty
                // Score 2: Quantity match bonus (exact match or close = bonus)
                var qtyRatio = saleQty > 0 && gr.quantity > 0
                    ? Math.min(saleQty, gr.quantity) / Math.max(saleQty, gr.quantity)
                    : 0;
                var qtyScore = qtyRatio * 30; // Up to 30 points for exact qty match
                var totalScore = dateScore + qtyScore;
                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestGR = gr;
                }
            }
            return bestGR;
        }
        var prisma, isAll, rows, deliveries_3, orderIds, salesOrders, _a, soMap, invoiceNumbers, opsTransactions, _b, opsMap_2, invoiceToDeliveries, _i, deliveries_1, sd, inv, sdQty, opsMapByDelivery, _c, opsMap_1, _d, inv, totalOps, sharedDeliveries, grandQty, remaining, i, share, productIdsInSales, allGRItemsRaw, _e, grItemsByProduct_2, _f, allGRItemsRaw_1, grItem, medianPriceByProduct_1, _g, grItemsByProduct_1, _h, productId, grItems, prices, mid, fmtDate, rowNo, _j, deliveries_2, sd, soNumber, buyer, tglJual, spJual, taxRate, sdTotalQty, refNum, invoiceOps, remainingInvoiceOps, remainingSdQty, mergedItemsMap, _k, _l, sdItem, _m, _o, alloc, lotGr, key, proportion, allocDiscount, existing, totalQty, prevQty, lotGr, key, existing, totalQty, prevQty, mergedItems, sdHeaderDiscount, sdSubtotal, _loop_1, _p, mergedItems_1, sdItem, error_1;
        var _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2;
        return __generator(this, function (_3) {
            switch (_3.label) {
                case 0:
                    prisma = (0, prisma_1.getPrisma)();
                    isAll = !prefix || prefix === 'ALL';
                    _3.label = 1;
                case 1:
                    _3.trys.push([1, 12, , 13]);
                    rows = [];
                    return [4 /*yield*/, prisma.salesDelivery.findMany({
                            where: __assign({ isVoid: false, date: { gte: startDate, lte: endDate } }, (isAll ? {} : { salesPerson: prefix })),
                            include: {
                                items: {
                                    include: {
                                        product: {
                                            select: {
                                                id: true, sku: true, name: true, uom: true,
                                                barcode: true, purchasePrice: true
                                            }
                                        },
                                        lotAllocations: { include: { lot: true } }
                                    }
                                }
                            },
                            orderBy: { date: 'asc' }
                        })];
                case 2:
                    deliveries_3 = _3.sent();
                    orderIds = __spreadArray([], new Set(deliveries_3.map(function (d) { return d.orderId; }).filter(Boolean)), true);
                    if (!(orderIds.length > 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, prisma.salesOrder.findMany({
                            where: { id: { in: orderIds } },
                            select: { id: true, orderNumber: true }
                        })];
                case 3:
                    _a = _3.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _a = [];
                    _3.label = 5;
                case 5:
                    salesOrders = _a;
                    soMap = new Map(salesOrders.map(function (o) { return [o.id, o.orderNumber]; }));
                    invoiceNumbers = deliveries_3.map(function (d) { return d.invoiceNumber || d.deliveryNumber; }).filter(Boolean);
                    if (!(invoiceNumbers.length > 0)) return [3 /*break*/, 7];
                    return [4 /*yield*/, prisma.financeTransaction.findMany({
                            where: {
                                OR: invoiceNumbers.map(function (inv) { return ({ invoiceNumber: { contains: inv } }); })
                            },
                            select: { invoiceNumber: true, amount: true, transactionType: true }
                        })];
                case 6:
                    _b = _3.sent();
                    return [3 /*break*/, 8];
                case 7:
                    _b = [];
                    _3.label = 8;
                case 8:
                    opsTransactions = _b;
                    opsMap_2 = new Map();
                    opsTransactions.forEach(function (t) {
                        if (!t.invoiceNumber)
                            return;
                        var amt = (t.transactionType === "PAYMENT" || t.transactionType === "EXPENSE" || Number(t.amount) < 0)
                            ? Math.abs(Number(t.amount))
                            : -Math.abs(Number(t.amount));
                        var invoices = t.invoiceNumber.split(',').map(function (inv) { return inv.trim(); }).filter(Boolean);
                        if (invoices.length > 0) {
                            var totalQty_1 = 0;
                            var qtyMap_1 = new Map();
                            invoices.forEach(function (inv) {
                                var matchingDelivery = deliveries_3.find(function (d) { return d.invoiceNumber === inv || d.deliveryNumber === inv; });
                                var qty = 1;
                                if (matchingDelivery && matchingDelivery.items) {
                                    qty = matchingDelivery.items.reduce(function (sum, item) { return sum + Number(item.quantity || 0); }, 0);
                                    if (qty === 0)
                                        qty = 1;
                                }
                                totalQty_1 += qty;
                                qtyMap_1.set(inv, qty);
                            });
                            var remainingAmt_1 = amt;
                            var remainingQty_1 = totalQty_1;
                            invoices.forEach(function (inv, index) {
                                var qty = qtyMap_1.get(inv) || 1;
                                var splitAmt = remainingQty_1 > 0 ? Math.round(remainingAmt_1 * (qty / remainingQty_1)) : Math.round(remainingAmt_1 / (invoices.length - index));
                                remainingAmt_1 -= splitAmt;
                                remainingQty_1 -= qty;
                                opsMap_2.set(inv, (opsMap_2.get(inv) || 0) + splitAmt);
                            });
                        }
                    });
                    invoiceToDeliveries = new Map();
                    for (_i = 0, deliveries_1 = deliveries_3; _i < deliveries_1.length; _i++) {
                        sd = deliveries_1[_i];
                        inv = sd.invoiceNumber || sd.deliveryNumber;
                        if (!invoiceToDeliveries.has(inv))
                            invoiceToDeliveries.set(inv, []);
                        sdQty = sd.items.reduce(function (sum, item) { return sum + Number(item.quantity || 0); }, 0) || 1;
                        invoiceToDeliveries.get(inv).push({ deliveryNumber: sd.deliveryNumber, totalQty: sdQty });
                    }
                    opsMapByDelivery = new Map();
                    for (_c = 0, opsMap_1 = opsMap_2; _c < opsMap_1.length; _c++) {
                        _d = opsMap_1[_c], inv = _d[0], totalOps = _d[1];
                        sharedDeliveries = invoiceToDeliveries.get(inv) || [];
                        if (sharedDeliveries.length <= 1) {
                            // Only 1 delivery uses this invoice → assign all OPS
                            opsMapByDelivery.set(inv, totalOps);
                        }
                        else {
                            grandQty = sharedDeliveries.reduce(function (s, d) { return s + d.totalQty; }, 0);
                            remaining = totalOps;
                            for (i = 0; i < sharedDeliveries.length; i++) {
                                share = i < sharedDeliveries.length - 1
                                    ? Math.round(totalOps * (sharedDeliveries[i].totalQty / grandQty))
                                    : remaining;
                                remaining -= share;
                                opsMapByDelivery.set(sharedDeliveries[i].deliveryNumber, (opsMapByDelivery.get(sharedDeliveries[i].deliveryNumber) || 0) + share);
                            }
                        }
                    }
                    productIdsInSales = Array.from(new Set(deliveries_3.flatMap(function (sd) { return sd.items.map(function (i) { return i.productId; }); }).filter(Boolean)));
                    if (!(productIdsInSales.length > 0)) return [3 /*break*/, 10];
                    return [4 /*yield*/, prisma.goodsReceiptItem.findMany({
                            where: {
                                productId: { in: productIdsInSales },
                                receipt: { isVoid: false }
                            },
                            include: {
                                receipt: {
                                    select: {
                                        receiptNumber: true, date: true, receivedFrom: true, salesPerson: true,
                                        isVoid: true, taxRate: true, formNumber: true,
                                        taxInvoiceDate: true, taxInvoiceNumber: true,
                                        totalDiscount: true, subtotal: true, cashbacks: true
                                    }
                                }
                            },
                            orderBy: { receipt: { date: 'asc' } }
                        })];
                case 9:
                    _e = _3.sent();
                    return [3 /*break*/, 11];
                case 10:
                    _e = [];
                    _3.label = 11;
                case 11:
                    allGRItemsRaw = _e;
                    grItemsByProduct_2 = new Map();
                    for (_f = 0, allGRItemsRaw_1 = allGRItemsRaw; _f < allGRItemsRaw_1.length; _f++) {
                        grItem = allGRItemsRaw_1[_f];
                        if (!grItemsByProduct_2.has(grItem.productId)) {
                            grItemsByProduct_2.set(grItem.productId, []);
                        }
                        grItemsByProduct_2.get(grItem.productId).push(grItem);
                    }
                    medianPriceByProduct_1 = new Map();
                    for (_g = 0, grItemsByProduct_1 = grItemsByProduct_2; _g < grItemsByProduct_1.length; _g++) {
                        _h = grItemsByProduct_1[_g], productId = _h[0], grItems = _h[1];
                        prices = grItems.map(function (g) { return Number(g.purchasePrice); }).filter(function (p) { return p > 0; }).sort(function (a, b) { return a - b; });
                        if (prices.length > 0) {
                            mid = Math.floor(prices.length / 2);
                            medianPriceByProduct_1.set(productId, prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid]);
                        }
                    }
                    fmtDate = function (d) { return d ? new Date(d).toLocaleDateString('id-ID') : '-'; };
                    rowNo = 0;
                    // ════════════════════════════════════════════════════════════
                    // STEP 1: PENJUALAN rows with SMART MATCHING
                    // ════════════════════════════════════════════════════════════
                    for (_j = 0, deliveries_2 = deliveries_3; _j < deliveries_2.length; _j++) {
                        sd = deliveries_2[_j];
                        soNumber = (_s = (_r = soMap.get((_q = sd.orderId) !== null && _q !== void 0 ? _q : '')) !== null && _r !== void 0 ? _r : sd.poNumber) !== null && _s !== void 0 ? _s : '-';
                        buyer = sd.buyerName || sd.recipient;
                        tglJual = fmtDate(sd.date);
                        spJual = sd.salesPerson || '-';
                        taxRate = Number(sd.taxRate || 0);
                        sdTotalQty = sd.items.reduce(function (sum, item) { return sum + item.quantity; }, 0);
                        refNum = sd.invoiceNumber || sd.deliveryNumber;
                        invoiceOps = (_v = (_u = (_t = opsMapByDelivery.get(sd.deliveryNumber)) !== null && _t !== void 0 ? _t : opsMapByDelivery.get(refNum)) !== null && _u !== void 0 ? _u : opsMap_2.get(refNum)) !== null && _v !== void 0 ? _v : 0;
                        remainingInvoiceOps = invoiceOps;
                        remainingSdQty = sdTotalQty;
                        mergedItemsMap = new Map();
                        for (_k = 0, _l = sd.items; _k < _l.length; _k++) {
                            sdItem = _l[_k];
                            if (sdItem.lotAllocations && sdItem.lotAllocations.length > 0) {
                                for (_m = 0, _o = sdItem.lotAllocations; _m < _o.length; _m++) {
                                    alloc = _o[_m];
                                    lotGr = alloc.lot.grNumber;
                                    key = "".concat(sdItem.productId, "_").concat(lotGr);
                                    proportion = alloc.qty / sdItem.quantity;
                                    allocDiscount = Number(sdItem.discount || 0) * proportion;
                                    if (mergedItemsMap.has(key)) {
                                        existing = mergedItemsMap.get(key);
                                        existing.quantity += alloc.qty;
                                        existing.discount += allocDiscount;
                                        totalQty = existing.quantity;
                                        prevQty = existing.quantity - alloc.qty;
                                        existing.salesPrice = (existing.salesPrice * prevQty + Number(sdItem.salesPrice || 0) * alloc.qty) / totalQty;
                                    }
                                    else {
                                        mergedItemsMap.set(key, __assign(__assign({}, sdItem), { quantity: alloc.qty, salesPrice: Number(sdItem.salesPrice || 0), discount: allocDiscount, product: sdItem.product, productId: sdItem.productId, _specificLotAllocation: alloc }));
                                    }
                                }
                            }
                            else {
                                lotGr = 'UNKNOWN';
                                key = "".concat(sdItem.productId, "_").concat(lotGr);
                                if (mergedItemsMap.has(key)) {
                                    existing = mergedItemsMap.get(key);
                                    existing.quantity += sdItem.quantity;
                                    existing.discount += Number(sdItem.discount || 0);
                                    totalQty = existing.quantity;
                                    prevQty = existing.quantity - sdItem.quantity;
                                    existing.salesPrice = (existing.salesPrice * prevQty + Number(sdItem.salesPrice || 0) * sdItem.quantity) / totalQty;
                                }
                                else {
                                    mergedItemsMap.set(key, __assign(__assign({}, sdItem), { quantity: sdItem.quantity, salesPrice: Number(sdItem.salesPrice || 0), discount: Number(sdItem.discount || 0), product: sdItem.product, productId: sdItem.productId, _specificLotAllocation: null }));
                                }
                            }
                        }
                        mergedItems = Array.from(mergedItemsMap.values());
                        sdHeaderDiscount = Number(sd.totalDiscount || 0);
                        sdSubtotal = mergedItems.reduce(function (sum, item) {
                            return sum + (Number(item.salesPrice || 0) * item.quantity - Number(item.discount || 0));
                        }, 0);
                        _loop_1 = function (sdItem) {
                            var barcode = sdItem.product.barcode || sdItem.product.sku;
                            var namaItem = sdItem.product.name;
                            var perCt = sdItem.product.uom || 'PCS';
                            var sellPrice = Number(sdItem.salesPrice || 0);
                            var itemDiscount = Number(sdItem.discount || 0);
                            var qty = sdItem.quantity;
                            var allocLotId = null;
                            // Distribusi diskon nota SD ke item ini (proporsional)
                            var sellLineSubtotal = sellPrice * qty - itemDiscount;
                            var sdDiscountShare = sdSubtotal > 0
                                ? Math.round(sdHeaderDiscount * (sellLineSubtotal / sdSubtotal))
                                : 0;
                            var totalSellDiscount = itemDiscount + sdDiscountShare;
                            // ── PRIORITY 1: USE ACTUAL LOT ALLOCATION (IF EXISTS) ──
                            var bestGR = null;
                            var grNumber = '-';
                            var grDate = null;
                            var supplierName = '-';
                            var hpp = Number(sdItem.product.purchasePrice || 0);
                            var purchaseTaxRate = 0;
                            var spBeli = '-';
                            if (sdItem._specificLotAllocation) {
                                var allocLot_1 = sdItem._specificLotAllocation.lot;
                                allocLotId = (allocLot_1 === null || allocLot_1 === void 0 ? void 0 : allocLot_1.id) || null;
                                grNumber = allocLot_1.grNumber;
                                grDate = allocLot_1.grDate;
                                supplierName = allocLot_1.supplierName;
                                hpp = Number(allocLot_1.purchasePrice);
                                // Lookup receipt info (like taxRate) from pre-fetched GRs
                                bestGR = ((_w = grItemsByProduct_2.get(sdItem.productId)) === null || _w === void 0 ? void 0 : _w.find(function (g) { return g.receipt.receiptNumber === allocLot_1.grNumber; })) || null;
                                if (bestGR) {
                                    purchaseTaxRate = Number(bestGR.receipt.taxRate || 0);
                                    spBeli = bestGR.receipt.salesPerson || '-';
                                }
                            }
                            else {
                                // ── SMART MATCHING: Fallback if no lot is explicitly allocated ──
                                bestGR = findBestGR(sdItem.productId, sd.date, qty);
                                if (bestGR) {
                                    grNumber = bestGR.receipt.receiptNumber;
                                    grDate = bestGR.receipt.date;
                                    supplierName = bestGR.receipt.receivedFrom;
                                    hpp = Number(bestGR.purchasePrice);
                                    purchaseTaxRate = Number(bestGR.receipt.taxRate || 0);
                                    spBeli = bestGR.receipt.salesPerson || '-';
                                }
                            }
                            // ── SISI BELI: Distribute header-level discount (diskon nota GR) & Cashback ──
                            var grHeaderDiscount = Number(((_x = bestGR === null || bestGR === void 0 ? void 0 : bestGR.receipt) === null || _x === void 0 ? void 0 : _x.totalDiscount) || 0);
                            var grSubtotal = Number(((_y = bestGR === null || bestGR === void 0 ? void 0 : bestGR.receipt) === null || _y === void 0 ? void 0 : _y.subtotal) || 0);
                            var buyItemDiscount = Number((bestGR === null || bestGR === void 0 ? void 0 : bestGR.discount) || 0);
                            var buyLineSubtotal = hpp * qty;
                            var grTotalCashback = 0;
                            if ((_z = bestGR === null || bestGR === void 0 ? void 0 : bestGR.receipt) === null || _z === void 0 ? void 0 : _z.cashbacks) {
                                try {
                                    var cbArray = typeof bestGR.receipt.cashbacks === 'string' ? JSON.parse(bestGR.receipt.cashbacks) : bestGR.receipt.cashbacks;
                                    if (Array.isArray(cbArray)) {
                                        var grDpp = Math.max(0, grSubtotal - grHeaderDiscount);
                                        for (var _4 = 0, cbArray_1 = cbArray; _4 < cbArray_1.length; _4++) {
                                            var cb = cbArray_1[_4];
                                            var rateStr = String(cb.rate).replace(/,/g, '.');
                                            var rate = parseFloat(rateStr) || 0;
                                            grTotalCashback += Math.floor(grDpp * (rate / 100));
                                        }
                                    }
                                }
                                catch (e) { }
                            }
                            var grDiscountShare = grSubtotal > 0
                                ? Math.round((grHeaderDiscount + grTotalCashback) * (buyLineSubtotal / grSubtotal))
                                : 0;
                            var totalBuyDiscount = buyItemDiscount + grDiscountShare;
                            // ── PPN CONSISTENCY RULE ──
                            // Sisi BELI: gunakan taxRate dari GR (purchaseTaxRate)
                            //   KB-LPBD (purchaseTaxRate=11%): HPP sudah tanpa PPN → Total Beli = DPP × 1.11
                            //   KB-LPB  (purchaseTaxRate=0%):  HPP sudah termasuk net → Total Beli = DPP (tanpa PPN)
                            // Sisi JUAL: tetap gunakan taxRate dari SD (KB-TRN=11%, KB-TRD=0%)
                            // DPP Beli = (HPP × qty) - Diskon Beli (item + nota GR)
                            var dppBeli = Math.round((hpp * qty) - totalBuyDiscount);
                            var totalBeli = Math.round(dppBeli * (1 + purchaseTaxRate / 100));
                            var hppEffective = qty > 0 ? Math.round(dppBeli / qty * (1 + purchaseTaxRate / 100)) : 0;
                            var grInfo = {
                                taxInvoiceDate: ((_0 = bestGR === null || bestGR === void 0 ? void 0 : bestGR.receipt) === null || _0 === void 0 ? void 0 : _0.taxInvoiceDate) || null,
                                formNumber: ((_1 = bestGR === null || bestGR === void 0 ? void 0 : bestGR.receipt) === null || _1 === void 0 ? void 0 : _1.formNumber) || null,
                                taxInvoiceNumber: ((_2 = bestGR === null || bestGR === void 0 ? void 0 : bestGR.receipt) === null || _2 === void 0 ? void 0 : _2.taxInvoiceNumber) || null,
                                taxRate: purchaseTaxRate
                            };
                            // DPP Jual = (Harga Jual × qty) - Diskon Jual (item + nota SD)
                            var dpp = Math.round((sellPrice * qty) - totalSellDiscount);
                            // PPN Jual = DPP × taxRate
                            var ppn = Math.round(dpp * taxRate / 100);
                            // Total Jual = DPP + PPN
                            var totalJual = dpp + ppn;
                            var rowOps = remainingSdQty > 0 ? Math.round(remainingInvoiceOps * (qty / remainingSdQty)) : 0;
                            remainingInvoiceOps -= rowOps;
                            remainingSdQty -= qty;
                            // Margin: Total Jual vs Total Beli (keduanya diskon nota sudah didistribusikan)
                            var margin = totalJual - totalBeli - rowOps;
                            var marginPct = totalJual > 0 ? (margin / totalJual * 100) : 0;
                            rowNo++;
                            rows.push({
                                _sortDate: sd.date,
                                'NO': rowNo,
                                'BARCODE': barcode,
                                'KETERANGAN ITEM': namaItem,
                                'PER/CT': perCt,
                                // ─ PEMBELIAN (COLUMNS FIRST) ─
                                'TANGGAL BELI': fmtDate(grDate),
                                'NOMOR LPB': grNumber,
                                'NAMA SUPPLIER': supplierName,
                                'SALES BELI': spBeli,
                                'QTY BELI': qty,
                                'HARGA BELI': hppEffective,
                                'OPS': rowOps,
                                'TOTAL BELI': totalBeli,
                                'F. PAJAK': fmtDate(grInfo.taxInvoiceDate),
                                'NO. FAKTUR': grInfo.formNumber || grNumber || '-',
                                'NO. PAJAK': grInfo.taxInvoiceNumber || '-',
                                // ─ PENJUALAN (COLUMNS SECOND) ─
                                'TANGGAL JUAL': tglJual,
                                'NOMOR SJ': sd.deliveryNumber,
                                'NOMOR FAKTUR PENJUALAN': sd.invoiceNumber || sd.deliveryNumber || '-',
                                'NAMA PEMBELI': buyer,
                                'SALES': spJual,
                                'QTY JUAL': qty,
                                'HARGA JUAL': Math.round(sellPrice * (1 + taxRate / 100)),
                                'TOTAL JUAL': totalJual,
                                'DPP': dpp,
                                'PPH': ppn,
                                'TOTAL': totalJual,
                                'NO. PO': soNumber,
                                'PAYMENT': sd.paymentStatus || 'PENDING',
                                // ─ KALKULASI & RETUR ─
                                'MARGIN': margin,
                                'MARGIN %': "".concat(marginPct.toFixed(1), "%"),
                                'NOMOR RETUR': '-',
                                '__DATA__': {
                                    sdItemId: sdItem.id,
                                    productId: sdItem.productId,
                                    currentLotId: allocLotId
                                }
                            });
                        };
                        for (_p = 0, mergedItems_1 = mergedItems; _p < mergedItems_1.length; _p++) {
                            sdItem = mergedItems_1[_p];
                            _loop_1(sdItem);
                        }
                    }
                    // STEP 5: Sort kronologis, re-number NO setelah sort
                    rows.sort(function (a, b) { return new Date(a._sortDate).getTime() - new Date(b._sortDate).getTime(); });
                    // Re-number setelah sort agar NO urut sesuai tanggal
                    rows.forEach(function (row, idx) { row['NO'] = idx + 1; });
                    return [2 /*return*/, rows.map(function (_a) {
                            var _sortDate = _a._sortDate, rest = __rest(_a, ["_sortDate"]);
                            return rest;
                        })];
                case 12:
                    error_1 = _3.sent();
                    console.error('[calculateProductTraceabilityInternal] ERROR:', error_1);
                    throw error_1;
                case 13: return [2 /*return*/];
            }
        });
    });
}
function getProductTraceabilityService(month, year, prefix) {
    return __awaiter(this, void 0, void 0, function () {
        var filterYear, filterMonth, startDate, endDate, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    filterYear = year || new Date().getFullYear();
                    filterMonth = month || (new Date().getMonth() + 1);
                    startDate = new Date(Date.UTC(filterYear, filterMonth - 1, 1, 0, 0, 0));
                    startDate.setUTCHours(startDate.getUTCHours() - 7);
                    endDate = new Date(Date.UTC(filterYear, filterMonth, 0, 23, 59, 59, 999));
                    endDate.setUTCHours(endDate.getUTCHours() - 7);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, calculateProductTraceabilityInternal(startDate, endDate, prefix)];
                case 2: return [2 /*return*/, _a.sent()];
                case 3:
                    error_2 = _a.sent();
                    console.error('[getProductTraceabilityService] ERROR:', error_2);
                    return [2 /*return*/, { error: error_2.message || 'Failed to fetch traceability report' }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * MONTHLY CLOSING REPORT SERVICE
 * Provides a consolidated view of Sales, Purchases, Expenses, and Profit/Loss for a specific period.
 */
function getMonthlyClosingReportService(month, year, prefix) {
    return __awaiter(this, void 0, void 0, function () {
        var prisma, filterYear, filterMonth, startDate, endDate, isAll, _a, sales, purchases, expenses, arRecords, apRecords, bankJournals_1, companyExpensesRecords, productIdsInSales, priceMap_1, lastGRPrices, monthlyTraceability, totalRevenue_1, totalHpp, beginningValue, beginningInventory, invErr_1, netPurchases, endingValue, totalExpenses, totalAR, totalAP, grossProfit, netProfit, companyExpenses, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prisma = (0, prisma_1.getPrisma)();
                    filterYear = year || new Date().getFullYear();
                    filterMonth = month || (new Date().getMonth() + 1);
                    startDate = new Date(filterYear, filterMonth - 1, 1);
                    endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59);
                    isAll = !prefix || prefix === 'ALL';
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 10, , 11]);
                    return [4 /*yield*/, Promise.all([
                            // 1. Total Sales (Revenue) - From Deliveries (Invoices)
                            prisma.salesDelivery.findMany({
                                where: __assign({ isVoid: false, date: { gte: startDate, lte: endDate } }, (isAll ? {} : { salesPerson: prefix })),
                                include: {
                                    items: {
                                        include: {
                                            lotAllocations: true,
                                            product: { select: { purchasePrice: true } }
                                        }
                                    }
                                },
                                orderBy: { date: 'asc' }
                            }),
                            // 2. Total Purchases (Inventory Additions)
                            prisma.goodsReceipt.findMany({
                                where: __assign({ isVoid: false, date: { gte: startDate, lte: endDate } }, (isAll ? {} : { salesPerson: prefix })),
                                orderBy: { date: 'asc' }
                            }),
                            // 3. Operational Expenses (Money Out)
                            prisma.financeTransaction.findMany({
                                where: {
                                    date: { gte: startDate, lte: endDate },
                                    AND: __spreadArray([
                                        { OR: [
                                                { transactionType: "PAYMENT" },
                                                { transactionType: "EXPENSE" },
                                                { amount: { lt: 0 } }
                                            ] }
                                    ], (isAll ? [] : [{
                                            OR: [
                                                { description: { contains: prefix, mode: 'insensitive' } },
                                                { salesPerson: prefix }
                                            ]
                                        }]), true)
                                },
                                orderBy: { date: 'asc' }
                            }),
                            // 4. Accounts Receivable (Unpaid Deliveries)
                            prisma.salesDelivery.findMany({
                                where: __assign({ isVoid: false, date: { lte: endDate }, paymentStatus: { in: ["PENDING", "PARTIAL"] } }, (isAll ? {} : { salesPerson: prefix })),
                                select: { grandTotal: true, paidAmount: true }
                            }),
                            // 5. Accounts Payable (Unpaid LPB)
                            prisma.goodsReceipt.findMany({
                                where: __assign({ isVoid: false, date: { lte: endDate }, paymentStatus: { in: ["PENDING", "PARTIAL"] } }, (isAll ? {} : { salesPerson: prefix })),
                                select: { grandTotal: true, paidAmount: true }
                            }),
                            // 6. Fetch Journal Entries for Bank Info mapping
                            prisma.journalEntry.findMany({
                                where: {
                                    date: { gte: startDate, lte: endDate },
                                    type: { in: ["DEBIT", "CREDIT"] },
                                    account: { code: { in: ["101", "102", "106", "107", "108", "109", "110"] } }
                                },
                                include: { account: true },
                                orderBy: { date: 'asc' }
                            }),
                            // 7. Global Operational Expenses
                            prisma.financeTransaction.findMany({
                                where: {
                                    date: { gte: startDate, lte: endDate },
                                    AND: [{ OR: [{ transactionType: "PAYMENT" }, { transactionType: "EXPENSE" }, { amount: { lt: 0 } }] }]
                                }
                            })
                        ])];
                case 2:
                    _a = _b.sent(), sales = _a[0], purchases = _a[1], expenses = _a[2], arRecords = _a[3], apRecords = _a[4], bankJournals_1 = _a[5], companyExpensesRecords = _a[6];
                    productIdsInSales = Array.from(new Set(sales.flatMap(function (s) { return (s.items || []).map(function (i) { return String(i.productId); }); }).filter(Boolean)));
                    priceMap_1 = {};
                    if (!(productIdsInSales.length > 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, prisma.goodsReceiptItem.findMany({
                            where: { productId: { in: productIdsInSales } },
                            orderBy: { id: 'desc' }, // Use id as fallback for latest record
                            select: { productId: true, purchasePrice: true }
                        })];
                case 3:
                    lastGRPrices = _b.sent();
                    lastGRPrices.forEach(function (lp) {
                        if (!priceMap_1[lp.productId])
                            priceMap_1[lp.productId] = Number(lp.purchasePrice || 0);
                    });
                    _b.label = 4;
                case 4: return [4 /*yield*/, calculateProductTraceabilityInternal(startDate, endDate, prefix).catch(function () { return []; })];
                case 5:
                    monthlyTraceability = _b.sent();
                    totalRevenue_1 = 0;
                    totalHpp = monthlyTraceability.reduce(function (sum, t) { return sum + Number(t['TOTAL BELI'] || 0); }, 0);
                    sales.forEach(function (s) {
                        totalRevenue_1 += Number(s.grandTotal || 0);
                    });
                    beginningValue = 0;
                    _b.label = 6;
                case 6:
                    _b.trys.push([6, 8, , 9]);
                    return [4 /*yield*/, prisma.stock.findMany({
                            include: { product: { select: { purchasePrice: true } } }
                        })];
                case 7:
                    beginningInventory = _b.sent();
                    beginningValue = beginningInventory.reduce(function (acc, s) {
                        var _a;
                        var price = priceMap_1[s.productId] || Number(((_a = s.product) === null || _a === void 0 ? void 0 : _a.purchasePrice) || 0);
                        return acc + (Number(s.quantity || 0) * price);
                    }, 0);
                    return [3 /*break*/, 9];
                case 8:
                    invErr_1 = _b.sent();
                    console.error("Inventory Valuation Error:", invErr_1);
                    beginningValue = 0; // Fallback to 0 to prevent total crash
                    return [3 /*break*/, 9];
                case 9:
                    netPurchases = purchases.reduce(function (acc, p) { return acc + Number(p.grandTotal || 0); }, 0);
                    endingValue = beginningValue + netPurchases - totalHpp;
                    totalExpenses = expenses.reduce(function (acc, e) { return acc + Math.abs(Number(e.amount || 0)); }, 0);
                    totalAR = arRecords.reduce(function (acc, r) { return acc + (Number(r.grandTotal) - Number(r.paidAmount)); }, 0);
                    totalAP = apRecords.reduce(function (acc, r) { return acc + (Number(r.grandTotal) - Number(r.paidAmount)); }, 0);
                    grossProfit = totalRevenue_1 - totalHpp;
                    netProfit = grossProfit - totalExpenses;
                    companyExpenses = companyExpensesRecords.reduce(function (acc, e) { return acc + Math.abs(Number(e.amount || 0)); }, 0);
                    return [2 /*return*/, {
                            period: "".concat(filterMonth, "/").concat(filterYear),
                            revenue: Number(totalRevenue_1 || 0),
                            hpp: Number(totalHpp || 0),
                            grossProfit: Number(grossProfit || 0),
                            expenses: Number(totalExpenses || 0),
                            companyExpenses: Number(companyExpenses || 0),
                            netProfit: Number(netProfit || 0),
                            inventory: {
                                beginning: beginningValue,
                                purchases: netPurchases,
                                ending: endingValue,
                                btud: beginningValue + netPurchases
                            },
                            outstandingAR: Number(totalAR || 0),
                            outstandingAP: Number(totalAP || 0),
                            debug: {
                                salesCount: sales.length,
                                totalItemsInSales: sales.reduce(function (acc, s) { var _a; return acc + (((_a = s.items) === null || _a === void 0 ? void 0 : _a.length) || 0); }, 0),
                                priceMapSize: Object.keys(priceMap_1).length
                            },
                            details: {
                                monthlyTraceability: monthlyTraceability,
                                sales: sales.map(function (s) {
                                    var _a;
                                    var relatedBank = bankJournals_1.find(function (j) { return j.description.includes(s.deliveryNumber); });
                                    return {
                                        id: s.id,
                                        number: s.deliveryNumber,
                                        invoiceNumber: s.invoiceNumber,
                                        date: s.date,
                                        entity: s.buyerName || s.recipient,
                                        totalQty: (s.items || []).reduce(function (acc, item) { return acc + Number(item.quantity || 0); }, 0),
                                        subtotal: Number(s.subtotal || 0),
                                        discount: Number(s.totalDiscount || 0),
                                        tax: Number(s.taxAmount || 0),
                                        grandTotal: Number(s.grandTotal || 0),
                                        paidAmount: Number(s.paidAmount || 0),
                                        bankCode: ((_a = relatedBank === null || relatedBank === void 0 ? void 0 : relatedBank.account) === null || _a === void 0 ? void 0 : _a.code) || "-",
                                        paymentDate: (relatedBank === null || relatedBank === void 0 ? void 0 : relatedBank.date) ? relatedBank.date : null
                                    };
                                }),
                                purchases: purchases.map(function (p) {
                                    var _a;
                                    var relatedBank = bankJournals_1.find(function (j) { return j.description.includes(p.receiptNumber); });
                                    return {
                                        id: p.id,
                                        number: p.receiptNumber,
                                        date: p.date,
                                        entity: p.receivedFrom,
                                        subtotal: Number(p.subtotal || 0),
                                        discount: Number(p.totalDiscount || 0),
                                        taxRate: Number(p.taxRate || 0),
                                        tax: Number(p.taxAmount || 0),
                                        grandTotal: Number(p.grandTotal || 0),
                                        paidAmount: Number(p.paidAmount || 0),
                                        bankCode: ((_a = relatedBank === null || relatedBank === void 0 ? void 0 : relatedBank.account) === null || _a === void 0 ? void 0 : _a.code) || "-",
                                        paymentDate: (relatedBank === null || relatedBank === void 0 ? void 0 : relatedBank.date) ? relatedBank.date : null
                                    };
                                }),
                                expenses: expenses.map(function (e) { return ({
                                    id: e.id,
                                    date: e.date,
                                    description: e.description,
                                    category: e.category || e.transactionType,
                                    amount: Number(e.amount || 0)
                                }); })
                            },
                            stats: {
                                salesCount: sales.length,
                                purchaseCount: purchases.length,
                                expenseCount: expenses.length
                            }
                        }];
                case 10:
                    error_3 = _b.sent();
                    console.error("[getMonthlyClosingReportService] ERROR:", error_3);
                    return [2 /*return*/, { error: error_3.message || "Failed to generate monthly closing report" }];
                case 11: return [2 /*return*/];
            }
        });
    });
}
/**
 * PURCHASE RETURNS DETAIL REPORT
 */
function getPurchaseReturnsDetailService() {
    return __awaiter(this, void 0, void 0, function () {
        var prisma;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = (0, prisma_1.getPrisma)();
                    return [4 /*yield*/, prisma.purchaseReturnItem.findMany({
                            select: {
                                quantity: true,
                                reason: true,
                                product: { select: { sku: true, name: true, uom: true } },
                                purchaseReturn: {
                                    select: {
                                        returnNumber: true,
                                        date: true,
                                        status: true,
                                        receipt: { select: { receiptNumber: true, receivedFrom: true } }
                                    }
                                }
                            },
                            orderBy: { purchaseReturn: { date: 'desc' } }
                        })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
/**
 * SALES RETURNS DETAIL REPORT
 */
function getSalesReturnsDetailService() {
    return __awaiter(this, void 0, void 0, function () {
        var prisma;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = (0, prisma_1.getPrisma)();
                    return [4 /*yield*/, prisma.salesReturnItem.findMany({
                            select: {
                                quantity: true,
                                reason: true,
                                product: { select: { sku: true, name: true, uom: true } },
                                salesReturn: {
                                    select: {
                                        returnNumber: true,
                                        date: true,
                                        status: true,
                                        delivery: { select: { deliveryNumber: true, recipient: true, buyerName: true } }
                                    }
                                }
                            },
                            orderBy: { salesReturn: { date: 'desc' } }
                        })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
/**
 * BATCH TRACEABILITY REPORT SERVICE
 * Perspektif: per Lot/Batch (GR Number), bukan per SJ.
 * Setiap baris adalah satu alokasi penjualan dari lot tersebut.
 * Jika lot belum pernah dijual, tetap muncul 1 baris dengan info lot saja.
 * Filter: berdasarkan GR Date (tanggal masuk lot), per bulan/tahun.
 * Akses: ADMIN, PURCHASE, FINANCE
 */
function getBatchTraceabilityService(filters) {
    return __awaiter(this, void 0, void 0, function () {
        var prisma, startDate, endDate, filterYear, filterMonth, lotWhere, lots, orderIds, salesOrders, _a, orderNumberMap, report, _i, lots_1, lot, hpp, sisaQty, initialQty, terjualQty, nilaiSisa, statusLot, rowNo, baseRow, _b, _c, alloc, delivery, sdItem, soNumber, totalJual, sellPrice, itemDiscount, qty, allocRatio, allocItemDiscount, sellLineSubtotal, sdSubtotal, sdHeaderDiscount, sdDiscountShare, isPKP, taxRate, hppTotal, margin, error_4;
        var _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    prisma = (0, prisma_1.getPrisma)();
                    startDate = filters.startDate;
                    endDate = filters.endDate;
                    if (!startDate || !endDate) {
                        filterYear = filters.year || new Date().getFullYear();
                        filterMonth = filters.month || (new Date().getMonth() + 1);
                        startDate = new Date(filterYear, filterMonth - 1, 1);
                        endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59);
                    }
                    lotWhere = {
                        grDate: { gte: startDate, lte: endDate }
                    };
                    // Status filter
                    if (filters.status === 'AKTIF') {
                        lotWhere.isVoided = false;
                        lotWhere.remainingQty = { gt: 0 };
                    }
                    else if (filters.status === 'HABIS') {
                        lotWhere.isVoided = false;
                        lotWhere.remainingQty = 0;
                    }
                    else if (filters.status === 'VOID') {
                        lotWhere.isVoided = true;
                    }
                    // ALL → tidak ada filter status tambahan
                    if (filters.supplier) {
                        lotWhere.supplierName = { contains: filters.supplier, mode: 'insensitive' };
                    }
                    if (filters.sku) {
                        lotWhere.product = { sku: { contains: filters.sku, mode: 'insensitive' } };
                    }
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, prisma.productLot.findMany({
                            where: lotWhere,
                            include: {
                                product: { select: { sku: true, name: true, uom: true } },
                                allocations: {
                                    include: {
                                        sdItem: {
                                            include: {
                                                delivery: {
                                                    select: {
                                                        deliveryNumber: true,
                                                        date: true,
                                                        buyerName: true,
                                                        recipient: true,
                                                        salesPerson: true,
                                                        paymentStatus: true,
                                                        orderId: true,
                                                        subtotal: true,
                                                        totalDiscount: true,
                                                        taxRate: true,
                                                        grandTotal: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            orderBy: [{ grDate: 'asc' }, { lotNumber: 'asc' }]
                        })];
                case 2:
                    lots = _f.sent();
                    orderIds = Array.from(new Set(lots.flatMap(function (lot) {
                        return lot.allocations
                            .map(function (a) { var _a, _b; return (_b = (_a = a.sdItem) === null || _a === void 0 ? void 0 : _a.delivery) === null || _b === void 0 ? void 0 : _b.orderId; })
                            .filter(Boolean);
                    })));
                    if (!(orderIds.length > 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, prisma.salesOrder.findMany({
                            where: { id: { in: orderIds } },
                            select: { id: true, orderNumber: true }
                        })];
                case 3:
                    _a = _f.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _a = [];
                    _f.label = 5;
                case 5:
                    salesOrders = _a;
                    orderNumberMap = new Map(salesOrders.map(function (o) { return [o.id, o.orderNumber]; }));
                    report = [];
                    for (_i = 0, lots_1 = lots; _i < lots_1.length; _i++) {
                        lot = lots_1[_i];
                        hpp = Number(lot.purchasePrice);
                        sisaQty = Number(lot.remainingQty);
                        initialQty = Number(lot.initialQty);
                        terjualQty = lot.allocations.reduce(function (s, a) { return s + Number(a.qty); }, 0);
                        nilaiSisa = Math.round(sisaQty * hpp);
                        statusLot = 'AKTIF';
                        if (lot.isVoided)
                            statusLot = 'VOID';
                        else if (sisaQty <= 0)
                            statusLot = 'HABIS';
                        rowNo = 1;
                        baseRow = {
                            'No. Lot': lot.lotNumber,
                            'No. GR (Batch Beli)': lot.grNumber,
                            'Tgl Masuk (GR Date)': lot.grDate ? new Date(lot.grDate).toLocaleDateString('id-ID') : '-',
                            'Supplier': lot.supplierName || '-',
                            'SKU': lot.product.sku,
                            'Nama Barang': lot.product.name,
                            'Satuan': lot.product.uom || 'PCS',
                            'QTY Masuk': initialQty,
                            'QTY Terjual (Total)': terjualQty,
                            'QTY Sisa': sisaQty,
                            'HPP Per Unit (Rp)': hpp,
                            'Nilai Sisa (Rp)': nilaiSisa,
                            'Status Lot': statusLot,
                            // Fields for ReportsDashboard Compatibility
                            'NO': rowNo++,
                            'BARCODE': lot.product.sku,
                            'KETERANGAN ITEM': lot.product.name,
                            'NAMA SUPPLIER': lot.supplierName || '-',
                            'NOMOR LPB': lot.grNumber,
                            'TANGGAL BELI': lot.grDate ? new Date(lot.grDate).toLocaleDateString('id-ID') : '-',
                            'QTY BELI': initialQty,
                            'TOTAL BELI': Math.round(initialQty * hpp),
                            'OPS': 0,
                        };
                        if (lot.allocations.length === 0) {
                            // Lot belum dijual — 1 baris kosong bagian penjualan
                            report.push(__assign(__assign({}, baseRow), { 'Tgl Jual': '-', 'No. SJ': '-', 'No. SO': '-', 'Buyer': '-', 'Sales Person Jual': '-', 'QTY Alokasi': 0, 'HPP Saat Jual (Rp)': hpp, 'Status Bayar Jual': '-', 
                                // Fields for ReportsDashboard Compatibility
                                'NAMA PEMBELI': '-', 'SALES': '-', 'NOMOR FAKTUR PENJUALAN': '-', 'NOMOR SJ': '-', 'TANGGAL JUAL': '-', 'QTY JUAL': 0, 'TOTAL JUAL': 0, 'MARGIN': 0 }));
                        }
                        else {
                            // Satu row per alokasi penjualan
                            for (_b = 0, _c = lot.allocations; _b < _c.length; _b++) {
                                alloc = _c[_b];
                                delivery = (_d = alloc.sdItem) === null || _d === void 0 ? void 0 : _d.delivery;
                                sdItem = alloc.sdItem;
                                soNumber = (delivery === null || delivery === void 0 ? void 0 : delivery.orderId)
                                    ? ((_e = orderNumberMap.get(delivery.orderId)) !== null && _e !== void 0 ? _e : '-')
                                    : '-';
                                totalJual = 0;
                                if (delivery && sdItem) {
                                    sellPrice = Number(sdItem.salesPrice || 0);
                                    itemDiscount = Number(sdItem.discount || 0);
                                    qty = Number(alloc.qty);
                                    allocRatio = Number(sdItem.quantity) > 0 ? qty / Number(sdItem.quantity) : 0;
                                    allocItemDiscount = itemDiscount * allocRatio;
                                    sellLineSubtotal = (sellPrice * qty) - allocItemDiscount;
                                    sdSubtotal = Number(delivery.subtotal || 0);
                                    sdHeaderDiscount = Number(delivery.totalDiscount || 0);
                                    sdDiscountShare = sdSubtotal > 0 ? Math.round(sdHeaderDiscount * (sellLineSubtotal / sdSubtotal)) : 0;
                                    totalJual = sellLineSubtotal - sdDiscountShare;
                                    isPKP = Number(delivery.taxRate || 0) > 0;
                                    if (isPKP) {
                                        taxRate = Number(delivery.taxRate || 11) / 100;
                                        totalJual = totalJual * (1 + taxRate);
                                    }
                                }
                                hppTotal = Number(alloc.hppAtTime) * Number(alloc.qty);
                                margin = totalJual - hppTotal;
                                report.push(__assign(__assign({}, baseRow), { 'NO': rowNo++, 'Tgl Jual': (delivery === null || delivery === void 0 ? void 0 : delivery.date)
                                        ? new Date(delivery.date).toLocaleDateString('id-ID')
                                        : '-', 'No. SJ': (delivery === null || delivery === void 0 ? void 0 : delivery.deliveryNumber) || '-', 'No. SO': soNumber, 'Buyer': (delivery === null || delivery === void 0 ? void 0 : delivery.buyerName) || (delivery === null || delivery === void 0 ? void 0 : delivery.recipient) || '-', 'Sales Person Jual': (delivery === null || delivery === void 0 ? void 0 : delivery.salesPerson) || 'CIBINONG', 'QTY Alokasi': Number(alloc.qty), 'HPP Saat Jual (Rp)': Number(alloc.hppAtTime), 'Status Bayar Jual': (delivery === null || delivery === void 0 ? void 0 : delivery.paymentStatus) || '-', 
                                    // Fields for ReportsDashboard Compatibility
                                    'NAMA PEMBELI': (delivery === null || delivery === void 0 ? void 0 : delivery.buyerName) || (delivery === null || delivery === void 0 ? void 0 : delivery.recipient) || '-', 'SALES': (delivery === null || delivery === void 0 ? void 0 : delivery.salesPerson) || 'CIBINONG', 'NOMOR FAKTUR PENJUALAN': soNumber, 'NOMOR SJ': (delivery === null || delivery === void 0 ? void 0 : delivery.deliveryNumber) || '-', 'TANGGAL JUAL': (delivery === null || delivery === void 0 ? void 0 : delivery.date) ? new Date(delivery.date).toLocaleDateString('id-ID') : '-', 'QTY JUAL': Number(alloc.qty), 'TOTAL JUAL': Math.round(totalJual), 'MARGIN': Math.round(margin), 'MARGIN %': totalJual > 0 ? (margin / totalJual * 100).toFixed(1) + '%' : '0%' }));
                            }
                        }
                    }
                    return [2 /*return*/, report];
                case 6:
                    error_4 = _f.sent();
                    console.error('[getBatchTraceabilityService] ERROR:', error_4);
                    throw new Error(error_4.message || 'Failed to generate batch traceability report');
                case 7: return [2 /*return*/];
            }
        });
    });
}
// ════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE REPORTING CENTER SERVICES
// ════════════════════════════════════════════════════════════════════════════
/**
 * COMPREHENSIVE DAILY REPORT SERVICE
 * Returns all transaction data for a single date across all modules
 */
function getComprehensiveDailyReportService(date, prefix) {
    return __awaiter(this, void 0, void 0, function () {
        var prisma, isAll, targetDate, dayStart, dayEnd, _a, sales, purchases, operational, returns_purchase, returns_sales, stockMovements, auditLogs, companyExpensesRecords, traceStartDate, traceEndDate, dailyTraceability, salesInvoiceNumbers_1, opsForSales, opsMap_3, i, chunk, chunkOps, opsByInvoice_1, totalSales, totalPurchases, totalSalesQty, totalPurchaseQty, incomeTransactions, expenseTransactions, totalIncome, generalExpense, linkedOpsExpense, totalExpense, salesPaid, salesPending, purchasePaid, purchasePending, totalHPP, grossProfit, netProfit, grossMarginPct, netMarginPct, financeActivity, _i, operational_1, o, userName, act, warehouseActivity, _b, purchases_1, p, creatorName, _c, purchases_2, p, verifierName, act, error_5;
        var _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    prisma = (0, prisma_1.getPrisma)();
                    isAll = !prefix || prefix === 'ALL';
                    targetDate = date ? new Date(date) : new Date();
                    dayStart = new Date(targetDate);
                    dayStart.setHours(0, 0, 0, 0);
                    dayEnd = new Date(targetDate);
                    dayEnd.setHours(23, 59, 59, 999);
                    _h.label = 1;
                case 1:
                    _h.trys.push([1, 9, , 10]);
                    return [4 /*yield*/, Promise.all([
                            // Sales Deliveries
                            prisma.salesDelivery.findMany({
                                where: __assign({ isVoid: false, date: { gte: dayStart, lte: dayEnd } }, (isAll ? {} : { salesPerson: prefix })),
                                include: {
                                    createdBy: { select: { name: true } },
                                    warehouse: { select: { name: true } },
                                    items: {
                                        include: {
                                            product: { select: { sku: true, name: true, purchasePrice: true } },
                                            lotAllocations: true
                                        }
                                    }
                                },
                                orderBy: { date: 'asc' }
                            }),
                            // Goods Receipts
                            prisma.goodsReceipt.findMany({
                                where: __assign({ isVoid: false, date: { gte: dayStart, lte: dayEnd } }, (isAll ? {} : { salesPerson: prefix })),
                                include: {
                                    createdBy: { select: { name: true } },
                                    warehouse: { select: { name: true } },
                                    items: { include: { product: { select: { sku: true, name: true } } } }
                                },
                                orderBy: { date: 'asc' }
                            }),
                            // Operational / Finance Transactions
                            prisma.financeTransaction.findMany({
                                where: __assign({ date: { gte: dayStart, lte: dayEnd } }, (isAll ? {} : {
                                    OR: [
                                        { description: { contains: prefix, mode: 'insensitive' } },
                                        { salesPerson: prefix }
                                    ]
                                })),
                                include: { createdBy: { select: { name: true } } },
                                orderBy: { date: 'asc' }
                            }),
                            // Purchase Returns
                            prisma.purchaseReturn.findMany({
                                where: __assign({ isVoid: false, date: { gte: dayStart, lte: dayEnd } }, (isAll ? {} : { receipt: { salesPerson: prefix } })),
                                include: {
                                    items: { include: { product: { select: { sku: true, name: true } } } },
                                    receipt: { select: { receiptNumber: true, receivedFrom: true } }
                                }
                            }),
                            // Sales Returns
                            prisma.salesReturn.findMany({
                                where: __assign({ isVoid: false, date: { gte: dayStart, lte: dayEnd } }, (isAll ? {} : { delivery: { salesPerson: prefix } })),
                                include: {
                                    items: { include: { product: { select: { sku: true, name: true } } } },
                                    delivery: { select: { deliveryNumber: true, buyerName: true } }
                                }
                            }),
                            // Stock Movements
                            prisma.stockMovement.findMany({
                                where: { createdAt: { gte: dayStart, lte: dayEnd } },
                                include: {
                                    product: { select: { sku: true, name: true } },
                                    warehouse: { select: { name: true } }
                                },
                                orderBy: { createdAt: 'asc' }
                            }),
                            // Audit Logs
                            prisma.auditLog.findMany({
                                where: { createdAt: { gte: dayStart, lte: dayEnd } },
                                include: { user: { select: { name: true, email: true } } },
                                orderBy: { createdAt: 'desc' },
                                take: 50
                            }),
                            prisma.financeTransaction.findMany({
                                where: { date: { gte: dayStart, lte: dayEnd }, AND: [{ OR: [{ transactionType: "PAYMENT" }, { transactionType: "EXPENSE" }, { amount: { lt: 0 } }] }] }
                            })
                        ])];
                case 2:
                    _a = _h.sent(), sales = _a[0], purchases = _a[1], operational = _a[2], returns_purchase = _a[3], returns_sales = _a[4], stockMovements = _a[5], auditLogs = _a[6], companyExpensesRecords = _a[7];
                    traceStartDate = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0));
                    traceStartDate.setUTCHours(traceStartDate.getUTCHours() - 7);
                    traceEndDate = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));
                    traceEndDate.setUTCHours(traceEndDate.getUTCHours() - 7);
                    return [4 /*yield*/, calculateProductTraceabilityInternal(traceStartDate, traceEndDate, prefix).catch(function () { return []; })];
                case 3:
                    dailyTraceability = _h.sent();
                    salesInvoiceNumbers_1 = sales.map(function (s) { return s.invoiceNumber; }).filter(Boolean);
                    opsForSales = [];
                    if (!(salesInvoiceNumbers_1.length > 0)) return [3 /*break*/, 8];
                    opsMap_3 = new Map();
                    i = 0;
                    _h.label = 4;
                case 4:
                    if (!(i < salesInvoiceNumbers_1.length)) return [3 /*break*/, 7];
                    chunk = salesInvoiceNumbers_1.slice(i, i + 100);
                    return [4 /*yield*/, prisma.financeTransaction.findMany({
                            where: {
                                OR: chunk.map(function (inv) { return ({
                                    invoiceNumber: { contains: inv }
                                }); })
                            },
                            select: { id: true, invoiceNumber: true, amount: true }
                        })];
                case 5:
                    chunkOps = _h.sent();
                    chunkOps.forEach(function (op) { return opsMap_3.set(op.id, op); });
                    _h.label = 6;
                case 6:
                    i += 100;
                    return [3 /*break*/, 4];
                case 7:
                    opsForSales = Array.from(opsMap_3.values());
                    _h.label = 8;
                case 8:
                    opsByInvoice_1 = opsForSales.reduce(function (acc, ops) {
                        if (!ops.invoiceNumber)
                            return acc;
                        var invNumbers = ops.invoiceNumber.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                        var amountPerInv = Math.abs(Number(ops.amount)) / (invNumbers.length || 1);
                        invNumbers.forEach(function (inv) {
                            if (salesInvoiceNumbers_1.includes(inv)) {
                                acc[inv] = (acc[inv] || 0) + amountPerInv;
                            }
                        });
                        return acc;
                    }, {});
                    totalSales = sales.reduce(function (s, d) { return s + Number(d.grandTotal || 0); }, 0);
                    totalPurchases = purchases.reduce(function (s, d) { return s + Number(d.grandTotal || 0); }, 0);
                    totalSalesQty = sales.reduce(function (s, d) {
                        return s + (d.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0);
                    }, 0);
                    totalPurchaseQty = purchases.reduce(function (s, d) {
                        return s + (d.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0);
                    }, 0);
                    incomeTransactions = operational.filter(function (o) {
                        return o.transactionType === 'RECEIPT' || Number(o.amount) > 0;
                    });
                    expenseTransactions = operational.filter(function (o) {
                        return (o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0) && !o.invoiceNumber;
                    });
                    totalIncome = incomeTransactions.reduce(function (s, o) { return s + Math.abs(Number(o.amount || 0)); }, 0);
                    generalExpense = expenseTransactions.reduce(function (s, o) { return s + Math.abs(Number(o.amount || 0)); }, 0);
                    linkedOpsExpense = dailyTraceability.reduce(function (sum, t) { return sum + Number(t['OPS'] || 0); }, 0);
                    totalExpense = generalExpense + linkedOpsExpense;
                    salesPaid = sales.filter(function (s) { return s.paymentStatus === 'PAID'; }).length;
                    salesPending = sales.filter(function (s) { return s.paymentStatus !== 'PAID'; }).length;
                    purchasePaid = purchases.filter(function (p) { return p.paymentStatus === 'PAID'; }).length;
                    purchasePending = purchases.filter(function (p) { return p.paymentStatus !== 'PAID'; }).length;
                    totalHPP = dailyTraceability.reduce(function (sum, t) { return sum + Number(t['TOTAL BELI'] || 0); }, 0);
                    grossProfit = totalSales - totalPurchases;
                    netProfit = grossProfit - totalExpense;
                    grossMarginPct = totalSales > 0 ? (grossProfit / totalSales * 100) : 0;
                    netMarginPct = totalSales > 0 ? (netProfit / totalSales * 100) : 0;
                    financeActivity = new Map();
                    for (_i = 0, operational_1 = operational; _i < operational_1.length; _i++) {
                        o = operational_1[_i];
                        userName = ((_d = o.createdBy) === null || _d === void 0 ? void 0 : _d.name) || ((_e = o.createdBy) === null || _e === void 0 ? void 0 : _e.email) || 'System';
                        if (!financeActivity.has(userName)) {
                            financeActivity.set(userName, { name: userName, count: 0, paymentAmount: 0, receiptAmount: 0 });
                        }
                        act = financeActivity.get(userName);
                        act.count++;
                        if (o.transactionType === 'PAYMENT' || Number(o.amount) < 0) {
                            act.paymentAmount += Math.abs(Number(o.amount || 0));
                        }
                        else {
                            act.receiptAmount += Math.abs(Number(o.amount || 0));
                        }
                    }
                    warehouseActivity = new Map();
                    for (_b = 0, purchases_1 = purchases; _b < purchases_1.length; _b++) {
                        p = purchases_1[_b];
                        creatorName = ((_f = p.createdBy) === null || _f === void 0 ? void 0 : _f.name) || ((_g = p.createdBy) === null || _g === void 0 ? void 0 : _g.email) || 'System';
                        if (!warehouseActivity.has(creatorName)) {
                            warehouseActivity.set(creatorName, { name: creatorName, createdCount: 0, verifiedCount: 0, totalQtyReceived: 0 });
                        }
                        warehouseActivity.get(creatorName).createdCount++;
                    }
                    for (_c = 0, purchases_2 = purchases; _c < purchases_2.length; _c++) {
                        p = purchases_2[_c];
                        if (p.isVerified && p.verifiedBy) {
                            verifierName = p.verifiedBy;
                            if (!warehouseActivity.has(verifierName)) {
                                warehouseActivity.set(verifierName, { name: verifierName, createdCount: 0, verifiedCount: 0, totalQtyReceived: 0 });
                            }
                            act = warehouseActivity.get(verifierName);
                            act.verifiedCount++;
                            act.totalQtyReceived += (p.items || []).reduce(function (sum, item) { return sum + Number(item.quantity || 0); }, 0);
                        }
                    }
                    return [2 /*return*/, {
                            date: dayStart.toISOString(),
                            staffActivity: {
                                finance: Array.from(financeActivity.values()),
                                warehouse: Array.from(warehouseActivity.values())
                            },
                            summary: {
                                totalSales: totalSales,
                                totalPurchases: totalPurchases,
                                totalIncome: totalIncome,
                                totalExpense: totalExpense,
                                totalSalesQty: totalSalesQty,
                                totalPurchaseQty: totalPurchaseQty,
                                salesCount: sales.length, purchaseCount: purchases.length,
                                opsCount: operational.length,
                                salesPaid: salesPaid,
                                salesPending: salesPending,
                                purchasePaid: purchasePaid,
                                purchasePending: purchasePending,
                                totalHPP: totalHPP,
                                grossProfit: grossProfit,
                                netProfit: netProfit,
                                grossMarginPct: grossMarginPct,
                                netMarginPct: netMarginPct,
                                returnPurchaseCount: returns_purchase.length,
                                returnSalesCount: returns_sales.length,
                                stockMovementCount: stockMovements.length
                            },
                            details: {
                                sales: sales.map(function (s) {
                                    var _a, _b;
                                    var saleHpp = 0;
                                    var isPKP = s.isPKP || Number(s.taxRate || 0) > 0 || String(s.invoiceNumber || '').includes('TRN');
                                    var taxMultiplier = 1 + (isPKP ? 0.11 : 0);
                                    (s.items || []).forEach(function (item) {
                                        var _a;
                                        var qty = Number(item.quantity || 0);
                                        if (item.lotAllocations && item.lotAllocations.length > 0) {
                                            item.lotAllocations.forEach(function (alloc) {
                                                saleHpp += Number(alloc.qty || 0) * Math.round(Number(alloc.hppAtTime || 0) * taxMultiplier);
                                            });
                                        }
                                        else {
                                            saleHpp += qty * Math.round(Number(((_a = item.product) === null || _a === void 0 ? void 0 : _a.purchasePrice) || 0) * taxMultiplier);
                                        }
                                    });
                                    var margin = Number(s.grandTotal || 0) - saleHpp;
                                    var marginPct = Number(s.grandTotal || 0) > 0 ? (margin / Number(s.grandTotal || 0) * 100) : 0;
                                    var itemDiscounts = (s.items || []).reduce(function (acc, i) { return acc + Number(i.discount || 0); }, 0);
                                    return {
                                        id: s.id, number: s.deliveryNumber, invoiceNumber: s.invoiceNumber, date: s.date,
                                        buyer: s.buyerName || s.recipient, salesPerson: s.salesPerson,
                                        alamat: s.recipient, gudang: (_a = s.warehouse) === null || _a === void 0 ? void 0 : _a.name,
                                        subtotal: Number(s.subtotal || 0) + itemDiscounts, discount: Number(s.totalDiscount || 0) + itemDiscounts,
                                        tax: Number(s.taxAmount || 0), grandTotal: Number(s.grandTotal || 0),
                                        paidAmount: Number(s.paidAmount || 0), paymentStatus: s.paymentStatus,
                                        operator: ((_b = s.createdBy) === null || _b === void 0 ? void 0 : _b.name) || 'System',
                                        itemCount: (s.items || []).length,
                                        totalQty: (s.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0),
                                        hpp: saleHpp,
                                        margin: margin,
                                        marginPct: marginPct,
                                        opsAmount: opsByInvoice_1[s.invoiceNumber] || 0,
                                        hasOps: (opsByInvoice_1[s.invoiceNumber] || 0) > 0
                                    };
                                }),
                                purchases: purchases.map(function (p) {
                                    var _a, _b;
                                    return ({
                                        id: p.id, number: p.receiptNumber, date: p.date,
                                        supplier: p.receivedFrom, warehouse: (_a = p.warehouse) === null || _a === void 0 ? void 0 : _a.name,
                                        salesPerson: p.salesPerson,
                                        subtotal: Number(p.subtotal || 0), discount: Number(p.totalDiscount || 0),
                                        tax: Number(p.taxAmount || 0), grandTotal: Number(p.grandTotal || 0),
                                        paidAmount: Number(p.paidAmount || 0), paymentStatus: p.paymentStatus,
                                        operator: ((_b = p.createdBy) === null || _b === void 0 ? void 0 : _b.name) || 'System',
                                        totalQty: (p.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0)
                                    });
                                }),
                                operational: operational.map(function (o) {
                                    var _a;
                                    return ({
                                        id: o.id, date: o.date, description: o.description,
                                        bank: o.bank, category: o.category || o.transactionType,
                                        amount: Number(o.amount || 0), salesPerson: o.salesPerson,
                                        referenceNumber: o.referenceNumber,
                                        operator: ((_a = o.createdBy) === null || _a === void 0 ? void 0 : _a.name) || 'System'
                                    });
                                }),
                                returnsPurchase: returns_purchase.map(function (r) {
                                    var _a, _b;
                                    return ({
                                        returnNumber: r.returnNumber, date: r.date, status: r.status,
                                        receiptNumber: (_a = r.receipt) === null || _a === void 0 ? void 0 : _a.receiptNumber, supplier: (_b = r.receipt) === null || _b === void 0 ? void 0 : _b.receivedFrom,
                                        items: (r.items || []).map(function (i) {
                                            var _a, _b;
                                            return ({
                                                sku: (_a = i.product) === null || _a === void 0 ? void 0 : _a.sku, name: (_b = i.product) === null || _b === void 0 ? void 0 : _b.name, qty: i.quantity, reason: i.reason
                                            });
                                        })
                                    });
                                }),
                                returnsSales: returns_sales.map(function (r) {
                                    var _a, _b;
                                    return ({
                                        returnNumber: r.returnNumber, date: r.date, status: r.status,
                                        deliveryNumber: (_a = r.delivery) === null || _a === void 0 ? void 0 : _a.deliveryNumber, buyer: (_b = r.delivery) === null || _b === void 0 ? void 0 : _b.buyerName,
                                        items: (r.items || []).map(function (i) {
                                            var _a, _b;
                                            return ({
                                                sku: (_a = i.product) === null || _a === void 0 ? void 0 : _a.sku, name: (_b = i.product) === null || _b === void 0 ? void 0 : _b.name, qty: i.quantity, reason: i.reason
                                            });
                                        })
                                    });
                                }),
                                stockMovements: stockMovements.map(function (m) {
                                    var _a, _b, _c;
                                    return ({
                                        date: m.createdAt, type: m.type, reference: m.reference,
                                        sku: (_a = m.product) === null || _a === void 0 ? void 0 : _a.sku, productName: (_b = m.product) === null || _b === void 0 ? void 0 : _b.name,
                                        warehouse: (_c = m.warehouse) === null || _c === void 0 ? void 0 : _c.name, quantity: m.quantity, vendorName: m.vendorName
                                    });
                                }),
                                auditLogs: auditLogs.map(function (a) {
                                    var _a, _b;
                                    return ({
                                        action: a.action, resource: a.resource, resourceId: a.resourceId,
                                        user: ((_a = a.user) === null || _a === void 0 ? void 0 : _a.name) || ((_b = a.user) === null || _b === void 0 ? void 0 : _b.email) || 'System',
                                        date: a.createdAt, details: a.details
                                    });
                                }),
                                dailyTraceability: dailyTraceability
                            }
                        }];
                case 9:
                    error_5 = _h.sent();
                    console.error('[getComprehensiveDailyReportService] ERROR:', error_5);
                    return [2 /*return*/, { error: error_5.message || 'Failed to generate daily report' }];
                case 10: return [2 /*return*/];
            }
        });
    });
}
/**
 * COMPREHENSIVE WEEKLY REPORT SERVICE
 * Returns aggregated data for 7 days with daily breakdowns
 */
function getComprehensiveWeeklyReportService(weekStartDate, prefix) {
    return __awaiter(this, void 0, void 0, function () {
        var prisma, isAll, startDate, day, diff, endDate, _a, sales, purchases, operational, stockMovements, weeklyTraceability, companyExpensesRecords, dailyBreakdown, _loop_2, i, buyerMap_1, topBuyers, supplierMap_1, topSuppliers, categoryMap_1, expenseByCategory, totalSales, totalPurchases, totalHPP, totalExpenses, grossProfit, netProfit, grossMarginPct, netMarginPct, salesBC_1, salesPF_1, salesOther_1, financeActivity, _i, operational_2, o, userName, act, warehouseActivity, _b, purchases_3, p, creatorName, _c, purchases_4, p, verifierName, act, error_6;
        var _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    prisma = (0, prisma_1.getPrisma)();
                    isAll = !prefix || prefix === 'ALL';
                    startDate = weekStartDate ? new Date(weekStartDate) : new Date();
                    if (!weekStartDate) {
                        day = startDate.getDay();
                        diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
                        startDate.setDate(diff);
                    }
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 6);
                    endDate.setHours(23, 59, 59, 999);
                    _h.label = 1;
                case 1:
                    _h.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, Promise.all([
                            prisma.salesDelivery.findMany({
                                where: __assign({ isVoid: false, date: { gte: startDate, lte: endDate } }, (isAll ? {} : { salesPerson: prefix })),
                                include: {
                                    items: {
                                        include: {
                                            product: { select: { sku: true, name: true, purchasePrice: true } },
                                            lotAllocations: true
                                        }
                                    }
                                },
                                orderBy: { date: 'asc' }
                            }),
                            prisma.goodsReceipt.findMany({
                                where: __assign({ isVoid: false, date: { gte: startDate, lte: endDate } }, (isAll ? {} : { salesPerson: prefix })),
                                include: {
                                    createdBy: { select: { name: true } },
                                    items: { select: { quantity: true, purchasePrice: true } }
                                },
                                orderBy: { date: 'asc' }
                            }),
                            prisma.financeTransaction.findMany({
                                where: __assign({ date: { gte: startDate, lte: endDate } }, (isAll ? {} : {
                                    OR: [
                                        { description: { contains: prefix, mode: 'insensitive' } },
                                        { salesPerson: prefix }
                                    ]
                                })),
                                include: { createdBy: { select: { name: true } } },
                                orderBy: { date: 'asc' }
                            }),
                            prisma.stockMovement.findMany({
                                where: { createdAt: { gte: startDate, lte: endDate } },
                                include: { product: { select: { sku: true, name: true } } },
                                orderBy: { createdAt: 'asc' }
                            }),
                            calculateProductTraceabilityInternal(startDate, endDate, prefix).catch(function () { return []; }),
                            prisma.financeTransaction.findMany({
                                where: { date: { gte: startDate, lte: endDate }, AND: [{ OR: [{ transactionType: "PAYMENT" }, { transactionType: "EXPENSE" }, { amount: { lt: 0 } }] }] }
                            })
                        ])];
                case 2:
                    _a = _h.sent(), sales = _a[0], purchases = _a[1], operational = _a[2], stockMovements = _a[3], weeklyTraceability = _a[4], companyExpensesRecords = _a[5];
                    dailyBreakdown = [];
                    _loop_2 = function (i) {
                        var dayStart = new Date(startDate);
                        dayStart.setDate(dayStart.getDate() + i);
                        dayStart.setHours(0, 0, 0, 0);
                        var dayEnd = new Date(dayStart);
                        dayEnd.setHours(23, 59, 59, 999);
                        var daySales = sales.filter(function (s) { return new Date(s.date) >= dayStart && new Date(s.date) <= dayEnd; });
                        var dayPurchases = purchases.filter(function (p) {
                            var d = p.date ? new Date(p.date) : null;
                            return d && d >= dayStart && d <= dayEnd;
                        });
                        var dayOps = operational.filter(function (o) { return new Date(o.date) >= dayStart && new Date(o.date) <= dayEnd; });
                        var salesTotal = daySales.reduce(function (s, d) { return s + Number(d.grandTotal || 0); }, 0);
                        var purchaseTotal = dayPurchases.reduce(function (s, d) { return s + Number(d.grandTotal || 0); }, 0);
                        var daySalesDeliveries = daySales.map(function (s) { return s.deliveryNumber; }).filter(Boolean);
                        var dayTraceRows = weeklyTraceability.filter(function (t) { return daySalesDeliveries.includes(t['NOMOR SJ']); });
                        var dayHPP = dayTraceRows.reduce(function (sum, t) { return sum + Number(t['TOTAL BELI'] || 0); }, 0);
                        var linkedOpsExpense = dayTraceRows.reduce(function (sum, t) { return sum + Number(t['OPS'] || 0); }, 0);
                        // General Ops that occurred today (unlinked)
                        var generalOps = dayOps.filter(function (o) {
                            return (o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0) && !o.invoiceNumber;
                        }).reduce(function (s, o) { return s + Math.abs(Number(o.amount || 0)); }, 0);
                        var opsExpense = generalOps + linkedOpsExpense;
                        var dayGrossProfit = salesTotal - dayHPP;
                        var dayMarginPct = salesTotal > 0 ? (dayGrossProfit / salesTotal * 100) : 0;
                        dailyBreakdown.push({
                            date: dayStart.toISOString(),
                            dayName: dayStart.toLocaleDateString('id-ID', { weekday: 'long' }),
                            shortName: dayStart.toLocaleDateString('id-ID', { weekday: 'short' }),
                            dateLabel: dayStart.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
                            sales: salesTotal,
                            purchases: purchaseTotal,
                            opsExpense: opsExpense,
                            hpp: dayHPP,
                            marginPct: dayMarginPct,
                            salesCount: daySales.length,
                            purchaseCount: dayPurchases.length,
                            salesQty: daySales.reduce(function (s, d) {
                                return s + (d.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0);
                            }, 0),
                            purchaseQty: dayPurchases.reduce(function (s, d) {
                                return s + (d.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0);
                            }, 0)
                        });
                    };
                    for (i = 0; i < 7; i++) {
                        _loop_2(i);
                    }
                    buyerMap_1 = {};
                    sales.forEach(function (s) {
                        var name = s.buyerName || s.recipient || 'Unknown';
                        if (!buyerMap_1[name])
                            buyerMap_1[name] = { total: 0, count: 0 };
                        buyerMap_1[name].total += Number(s.grandTotal || 0);
                        buyerMap_1[name].count += 1;
                    });
                    topBuyers = Object.entries(buyerMap_1)
                        .map(function (_a) {
                        var name = _a[0], data = _a[1];
                        return (__assign({ name: name }, data));
                    })
                        .sort(function (a, b) { return b.total - a.total; })
                        .slice(0, 5);
                    supplierMap_1 = {};
                    purchases.forEach(function (p) {
                        var name = p.receivedFrom || 'Unknown';
                        if (!supplierMap_1[name])
                            supplierMap_1[name] = { total: 0, count: 0 };
                        supplierMap_1[name].total += Number(p.grandTotal || 0);
                        supplierMap_1[name].count += 1;
                    });
                    topSuppliers = Object.entries(supplierMap_1)
                        .map(function (_a) {
                        var name = _a[0], data = _a[1];
                        return (__assign({ name: name }, data));
                    })
                        .sort(function (a, b) { return b.total - a.total; })
                        .slice(0, 5);
                    categoryMap_1 = {};
                    operational.forEach(function (o) {
                        if (o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0) {
                            var cat = o.category || o.transactionType || 'Lainnya';
                            categoryMap_1[cat] = (categoryMap_1[cat] || 0) + Math.abs(Number(o.amount || 0));
                        }
                    });
                    expenseByCategory = Object.entries(categoryMap_1)
                        .map(function (_a) {
                        var name = _a[0], value = _a[1];
                        return ({ name: name, value: value });
                    })
                        .sort(function (a, b) { return b.value - a.value; });
                    totalSales = sales.reduce(function (s, d) { return s + Number(d.grandTotal || 0); }, 0);
                    totalPurchases = purchases.reduce(function (s, d) { return s + Number(d.grandTotal || 0); }, 0);
                    totalHPP = dailyBreakdown.reduce(function (sum, d) { return sum + Number(d.hpp || 0); }, 0);
                    totalExpenses = dailyBreakdown.reduce(function (sum, d) { return sum + Number(d.opsExpense || 0); }, 0);
                    grossProfit = totalSales - totalPurchases;
                    netProfit = grossProfit - totalExpenses;
                    grossMarginPct = totalSales > 0 ? (grossProfit / totalSales * 100) : 0;
                    netMarginPct = totalSales > 0 ? (netProfit / totalSales * 100) : 0;
                    salesBC_1 = 0, salesPF_1 = 0, salesOther_1 = 0;
                    sales.forEach(function (s) {
                        var v = Number(s.grandTotal || 0);
                        if (s.salesPerson === 'BC')
                            salesBC_1 += v;
                        else if (s.salesPerson === 'PF')
                            salesPF_1 += v;
                        else
                            salesOther_1 += v;
                    });
                    financeActivity = new Map();
                    for (_i = 0, operational_2 = operational; _i < operational_2.length; _i++) {
                        o = operational_2[_i];
                        userName = ((_d = o.createdBy) === null || _d === void 0 ? void 0 : _d.name) || ((_e = o.createdBy) === null || _e === void 0 ? void 0 : _e.email) || 'System';
                        if (!financeActivity.has(userName)) {
                            financeActivity.set(userName, { name: userName, count: 0, paymentAmount: 0, receiptAmount: 0 });
                        }
                        act = financeActivity.get(userName);
                        act.count++;
                        if (o.transactionType === 'PAYMENT' || Number(o.amount) < 0) {
                            act.paymentAmount += Math.abs(Number(o.amount || 0));
                        }
                        else {
                            act.receiptAmount += Math.abs(Number(o.amount || 0));
                        }
                    }
                    warehouseActivity = new Map();
                    for (_b = 0, purchases_3 = purchases; _b < purchases_3.length; _b++) {
                        p = purchases_3[_b];
                        creatorName = ((_f = p.createdBy) === null || _f === void 0 ? void 0 : _f.name) || ((_g = p.createdBy) === null || _g === void 0 ? void 0 : _g.email) || 'System';
                        if (!warehouseActivity.has(creatorName)) {
                            warehouseActivity.set(creatorName, { name: creatorName, createdCount: 0, verifiedCount: 0, totalQtyReceived: 0 });
                        }
                        warehouseActivity.get(creatorName).createdCount++;
                    }
                    for (_c = 0, purchases_4 = purchases; _c < purchases_4.length; _c++) {
                        p = purchases_4[_c];
                        if (p.isVerified && p.verifiedBy) {
                            verifierName = p.verifiedBy;
                            if (!warehouseActivity.has(verifierName)) {
                                warehouseActivity.set(verifierName, { name: verifierName, createdCount: 0, verifiedCount: 0, totalQtyReceived: 0 });
                            }
                            act = warehouseActivity.get(verifierName);
                            act.verifiedCount++;
                            act.totalQtyReceived += (p.items || []).reduce(function (sum, item) { return sum + Number(item.quantity || 0); }, 0);
                        }
                    }
                    return [2 /*return*/, {
                            staffActivity: {
                                finance: Array.from(financeActivity.values()),
                                warehouse: Array.from(warehouseActivity.values())
                            },
                            details: {
                                weeklyTraceability: weeklyTraceability
                            },
                            period: {
                                start: startDate.toISOString(),
                                end: endDate.toISOString(),
                                label: "".concat(startDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }), " - ").concat(endDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }))
                            },
                            summary: {
                                totalSales: totalSales,
                                totalPurchases: totalPurchases,
                                totalExpenses: totalExpenses,
                                totalHPP: totalHPP,
                                grossProfit: grossProfit,
                                netProfit: netProfit,
                                grossMarginPct: grossMarginPct,
                                netMarginPct: netMarginPct,
                                salesCount: sales.length,
                                purchaseCount: purchases.length,
                                opsCount: operational.length,
                                totalSalesQty: sales.reduce(function (s, d) {
                                    return s + (d.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0);
                                }, 0),
                                totalPurchaseQty: purchases.reduce(function (s, d) {
                                    return s + (d.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0);
                                }, 0),
                                salesByTeam: { BC: salesBC_1, PF: salesPF_1, Other: salesOther_1 }
                            },
                            dailyBreakdown: dailyBreakdown,
                            topBuyers: topBuyers,
                            topSuppliers: topSuppliers,
                            expenseByCategory: expenseByCategory
                        }];
                case 3:
                    error_6 = _h.sent();
                    console.error('[getComprehensiveWeeklyReportService] ERROR:', error_6);
                    return [2 /*return*/, { error: error_6.message || 'Failed to generate weekly report' }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * COMPREHENSIVE MONTHLY REPORT SERVICE
 * Full P&L, AR/AP aging, inventory valuation, top partner analysis
 */
function getComprehensiveMonthlyReportService(month, year, prefix) {
    return __awaiter(this, void 0, void 0, function () {
        var prisma, filterYear, filterMonth, startDate, endDate, isAll, _a, sales, purchases, allOperational, arRecords, apRecords, returnsPurchase, returnsSales, stockMovements, monthlyTraceability_1, companyExpensesRecords, totalRevenue, totalRevenueSubtotal, totalSalesTax, totalDiscount, totalHPP, grossProfit, grossMarginPct, expenses, generalOps, linkedOpsExpense, totalExpenses, companyExpenses, netProfit, netMarginPct, netPurchases, netPurchasesSubtotal, salesBC_2, salesPF_2, salesOther_2, hppBC, hppPF, categoryMap_2, expenseByCategory, buyerMap_2, topBuyers, supplierMap_2, topSuppliers, now_1, agingBuckets, arAging, apAging, daysInMonth, dailyBreakdown, _loop_3, d, returnPurchaseSummary, returnSalesSummary, salesDetail, purchaseDetail, opsDetail, monthNames, financeActivity, _i, allOperational_1, o, userName, act, warehouseActivity, _b, purchases_5, p, creatorName, _c, purchases_6, p, verifierName, act, error_7;
        var _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    prisma = (0, prisma_1.getPrisma)();
                    filterYear = year || new Date().getFullYear();
                    filterMonth = month || (new Date().getMonth() + 1);
                    startDate = new Date(filterYear, filterMonth - 1, 1);
                    endDate = new Date(filterYear, filterMonth, 0, 23, 59, 59, 999);
                    isAll = !prefix || prefix === 'ALL';
                    _h.label = 1;
                case 1:
                    _h.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, Promise.all([
                            // Sales
                            prisma.salesDelivery.findMany({
                                where: __assign({ isVoid: false, date: { gte: startDate, lte: endDate } }, (isAll ? {} : { salesPerson: prefix })),
                                include: {
                                    items: {
                                        include: {
                                            product: { select: { sku: true, name: true, purchasePrice: true } },
                                            lotAllocations: true
                                        }
                                    }
                                },
                                orderBy: { date: 'asc' }
                            }),
                            // Purchases
                            prisma.goodsReceipt.findMany({
                                where: __assign({ isVoid: false, date: { gte: startDate, lte: endDate } }, (isAll ? {} : { salesPerson: prefix })),
                                include: {
                                    createdBy: { select: { name: true } },
                                    items: { select: { quantity: true } }
                                },
                                orderBy: { date: 'asc' }
                            }),
                            // All Finance Transactions
                            prisma.financeTransaction.findMany({
                                where: __assign({ date: { gte: startDate, lte: endDate } }, (isAll ? {} : {
                                    OR: [
                                        { description: { contains: prefix, mode: 'insensitive' } },
                                        { salesPerson: prefix }
                                    ]
                                })),
                                include: { createdBy: { select: { name: true } } },
                                orderBy: { date: 'asc' }
                            }),
                            // AR — unpaid sales deliveries up to end of month
                            prisma.salesDelivery.findMany({
                                where: __assign({ isVoid: false, date: { lte: endDate }, paymentStatus: { in: ['PENDING', 'PARTIAL'] } }, (isAll ? {} : { salesPerson: prefix })),
                                select: {
                                    deliveryNumber: true, buyerName: true, recipient: true, date: true,
                                    grandTotal: true, paidAmount: true, paymentStatus: true
                                },
                                orderBy: { date: 'asc' }
                            }),
                            // AP — unpaid goods receipts up to end of month
                            prisma.goodsReceipt.findMany({
                                where: __assign({ isVoid: false, date: { lte: endDate }, paymentStatus: { in: ['PENDING', 'PARTIAL'] } }, (isAll ? {} : { salesPerson: prefix })),
                                select: {
                                    receiptNumber: true, receivedFrom: true, date: true,
                                    grandTotal: true, paidAmount: true, paymentStatus: true
                                },
                                orderBy: { date: 'asc' }
                            }),
                            // Purchase Returns
                            prisma.purchaseReturn.findMany({
                                where: __assign({ isVoid: false, date: { gte: startDate, lte: endDate } }, (isAll ? {} : { receipt: { salesPerson: prefix } })),
                                include: {
                                    items: { include: { product: { select: { sku: true, name: true } } } },
                                    receipt: { select: { receiptNumber: true, receivedFrom: true } }
                                }
                            }),
                            // Sales Returns
                            prisma.salesReturn.findMany({
                                where: __assign({ isVoid: false, date: { gte: startDate, lte: endDate } }, (isAll ? {} : { delivery: { salesPerson: prefix } })),
                                include: {
                                    items: { include: { product: { select: { sku: true, name: true } } } },
                                    delivery: { select: { deliveryNumber: true, buyerName: true } }
                                }
                            }),
                            // Stock Movements
                            prisma.stockMovement.findMany({
                                where: { createdAt: { gte: startDate, lte: endDate } },
                                include: { product: { select: { sku: true, name: true } } },
                                orderBy: { createdAt: 'asc' }
                            }),
                            // Traceability
                            calculateProductTraceabilityInternal(startDate, endDate, prefix).catch(function () { return []; }),
                            prisma.financeTransaction.findMany({
                                where: { date: { gte: startDate, lte: endDate }, AND: [{ OR: [{ transactionType: "PAYMENT" }, { transactionType: "EXPENSE" }, { amount: { lt: 0 } }] }] }
                            })
                        ])];
                case 2:
                    _a = _h.sent(), sales = _a[0], purchases = _a[1], allOperational = _a[2], arRecords = _a[3], apRecords = _a[4], returnsPurchase = _a[5], returnsSales = _a[6], stockMovements = _a[7], monthlyTraceability_1 = _a[8], companyExpensesRecords = _a[9];
                    totalRevenue = monthlyTraceability_1.reduce(function (sum, t) { return sum + Number(t['TOTAL JUAL'] || 0); }, 0);
                    totalRevenueSubtotal = monthlyTraceability_1.reduce(function (sum, t) { return sum + Number(t['DPP'] || 0); }, 0);
                    totalSalesTax = monthlyTraceability_1.reduce(function (sum, t) { return sum + Number(t['PPH'] || 0); }, 0);
                    totalDiscount = 0;
                    totalHPP = monthlyTraceability_1.reduce(function (sum, t) { return sum + Number(t['TOTAL BELI'] || 0); }, 0);
                    grossProfit = totalRevenue - totalHPP;
                    grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0;
                    expenses = allOperational.filter(function (o) {
                        return o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0;
                    });
                    generalOps = expenses.filter(function (o) { return !o.invoiceNumber; }).reduce(function (s, o) { return s + Math.abs(Number(o.amount || 0)); }, 0);
                    linkedOpsExpense = monthlyTraceability_1.reduce(function (sum, t) { return sum + Number(t['OPS'] || 0); }, 0);
                    totalExpenses = generalOps + linkedOpsExpense;
                    companyExpenses = companyExpensesRecords.reduce(function (acc, e) { return acc + Math.abs(Number(e.amount || 0)); }, 0);
                    netProfit = grossProfit - totalExpenses;
                    netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0;
                    netPurchases = purchases.reduce(function (s, p) { return s + Number(p.grandTotal || 0); }, 0);
                    netPurchasesSubtotal = purchases.reduce(function (s, p) { return s + Number(p.subtotal || 0); }, 0);
                    salesBC_2 = 0, salesPF_2 = 0, salesOther_2 = 0;
                    hppBC = 0, hppPF = 0;
                    sales.forEach(function (s) {
                        var v = Number(s.grandTotal || 0);
                        if (s.salesPerson === 'BC')
                            salesBC_2 += v;
                        else if (s.salesPerson === 'PF')
                            salesPF_2 += v;
                        else
                            salesOther_2 += v;
                    });
                    categoryMap_2 = {};
                    expenses.forEach(function (o) {
                        var cat = o.category || o.transactionType || 'Lainnya';
                        categoryMap_2[cat] = (categoryMap_2[cat] || 0) + Math.abs(Number(o.amount || 0));
                    });
                    expenseByCategory = Object.entries(categoryMap_2)
                        .map(function (_a) {
                        var name = _a[0], value = _a[1];
                        return ({ name: name, value: value });
                    })
                        .sort(function (a, b) { return b.value - a.value; });
                    buyerMap_2 = {};
                    sales.forEach(function (s) {
                        var name = s.buyerName || s.recipient || 'Unknown';
                        var qty = (s.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0);
                        if (!buyerMap_2[name])
                            buyerMap_2[name] = { total: 0, count: 0, totalQty: 0 };
                        buyerMap_2[name].total += Number(s.grandTotal || 0);
                        buyerMap_2[name].count += 1;
                        buyerMap_2[name].totalQty += qty;
                    });
                    topBuyers = Object.entries(buyerMap_2)
                        .map(function (_a) {
                        var name = _a[0], data = _a[1];
                        return (__assign({ name: name }, data));
                    })
                        .sort(function (a, b) { return b.total - a.total; })
                        .slice(0, 10);
                    supplierMap_2 = {};
                    purchases.forEach(function (p) {
                        var name = p.receivedFrom || 'Unknown';
                        if (!supplierMap_2[name])
                            supplierMap_2[name] = { total: 0, count: 0 };
                        supplierMap_2[name].total += Number(p.grandTotal || 0);
                        supplierMap_2[name].count += 1;
                    });
                    topSuppliers = Object.entries(supplierMap_2)
                        .map(function (_a) {
                        var name = _a[0], data = _a[1];
                        return (__assign({ name: name }, data));
                    })
                        .sort(function (a, b) { return b.total - a.total; })
                        .slice(0, 10);
                    now_1 = new Date();
                    agingBuckets = function (records, dateField) {
                        var buckets = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0, total: 0 };
                        var items = [];
                        records.forEach(function (r) {
                            var outstanding = Number(r.grandTotal || 0) - Number(r.paidAmount || 0);
                            if (outstanding <= 0)
                                return;
                            var days = Math.floor((now_1.getTime() - new Date(r[dateField] || r.date).getTime()) / (1000 * 60 * 60 * 24));
                            var bucket = 'current';
                            if (days > 90)
                                bucket = 'over90';
                            else if (days > 60)
                                bucket = 'd90';
                            else if (days > 30)
                                bucket = 'd60';
                            else if (days > 0)
                                bucket = 'd30';
                            buckets[bucket] += outstanding;
                            buckets.total += outstanding;
                            items.push({
                                number: r.deliveryNumber || r.receiptNumber,
                                partner: r.buyerName || r.recipient || r.receivedFrom,
                                date: r.date,
                                grandTotal: Number(r.grandTotal || 0),
                                paidAmount: Number(r.paidAmount || 0),
                                outstanding: outstanding,
                                days: days,
                                bucket: bucket,
                                status: r.paymentStatus
                            });
                        });
                        return { buckets: buckets, items: items.sort(function (a, b) { return b.outstanding - a.outstanding; }) };
                    };
                    arAging = agingBuckets(arRecords, 'date');
                    apAging = agingBuckets(apRecords, 'date');
                    daysInMonth = new Date(filterYear, filterMonth, 0).getDate();
                    dailyBreakdown = [];
                    _loop_3 = function (d) {
                        var dayStart = new Date(filterYear, filterMonth - 1, d, 0, 0, 0);
                        var dayEnd = new Date(filterYear, filterMonth - 1, d, 23, 59, 59, 999);
                        var daySales = sales.filter(function (s) {
                            var dt = new Date(s.date);
                            return dt >= dayStart && dt <= dayEnd;
                        });
                        var dayPurchases = purchases.filter(function (p) {
                            var dt = p.date ? new Date(p.date) : null;
                            return dt && dt >= dayStart && dt <= dayEnd;
                        });
                        var dayOps = allOperational.filter(function (o) { return new Date(o.date) >= dayStart && new Date(o.date) <= dayEnd; });
                        var salesTotal = daySales.reduce(function (s, x) { return s + Number(x.grandTotal || 0); }, 0);
                        var purchaseTotal = dayPurchases.reduce(function (s, x) { return s + Number(x.grandTotal || 0); }, 0);
                        var daySalesDeliveries = daySales.map(function (s) { return s.deliveryNumber; }).filter(Boolean);
                        var dayTraceRows = monthlyTraceability_1.filter(function (t) { return daySalesDeliveries.includes(t['NOMOR SJ']); });
                        var dayHPP = dayTraceRows.reduce(function (sum, t) { return sum + Number(t['TOTAL BELI'] || 0); }, 0);
                        var linkedOpsExpense_1 = dayTraceRows.reduce(function (sum, t) { return sum + Number(t['OPS'] || 0); }, 0);
                        // General Ops that occurred today (unlinked)
                        var generalOpsToday = dayOps.filter(function (o) {
                            return (o.transactionType === 'PAYMENT' || o.transactionType === 'EXPENSE' || Number(o.amount) < 0) && !o.invoiceNumber;
                        }).reduce(function (s, o) { return s + Math.abs(Number(o.amount || 0)); }, 0);
                        var opsExpense = generalOpsToday + linkedOpsExpense_1;
                        dailyBreakdown.push({
                            day: d,
                            label: "".concat(d),
                            sales: salesTotal,
                            purchases: purchaseTotal,
                            hpp: dayHPP,
                            opsExpense: opsExpense,
                            salesCount: daySales.length,
                            purchaseCount: dayPurchases.length
                        });
                    };
                    for (d = 1; d <= daysInMonth; d++) {
                        _loop_3(d);
                    }
                    returnPurchaseSummary = {
                        count: returnsPurchase.length,
                        totalQty: returnsPurchase.reduce(function (s, r) {
                            return s + (r.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0);
                        }, 0),
                        items: returnsPurchase.map(function (r) {
                            var _a, _b;
                            return ({
                                returnNumber: r.returnNumber, date: r.date, status: r.status,
                                supplier: (_a = r.receipt) === null || _a === void 0 ? void 0 : _a.receivedFrom, receiptNumber: (_b = r.receipt) === null || _b === void 0 ? void 0 : _b.receiptNumber,
                                totalQty: (r.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0)
                            });
                        })
                    };
                    returnSalesSummary = {
                        count: returnsSales.length,
                        totalQty: returnsSales.reduce(function (s, r) {
                            return s + (r.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0);
                        }, 0),
                        items: returnsSales.map(function (r) {
                            var _a, _b;
                            return ({
                                returnNumber: r.returnNumber, date: r.date, status: r.status,
                                buyer: (_a = r.delivery) === null || _a === void 0 ? void 0 : _a.buyerName, deliveryNumber: (_b = r.delivery) === null || _b === void 0 ? void 0 : _b.deliveryNumber,
                                totalQty: (r.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0)
                            });
                        })
                    };
                    salesDetail = sales.map(function (s) {
                        var saleTraceRows = monthlyTraceability_1.filter(function (t) { return t['NOMOR SJ'] === s.deliveryNumber; });
                        var saleHpp = saleTraceRows.reduce(function (sum, t) { return sum + Number(t['TOTAL BELI'] || 0); }, 0);
                        var margin = Number(s.grandTotal || 0) - saleHpp;
                        var marginPct = Number(s.grandTotal || 0) > 0 ? (margin / Number(s.grandTotal || 0) * 100) : 0;
                        var itemDiscounts = (s.items || []).reduce(function (acc, i) { return acc + Number(i.discount || 0); }, 0);
                        return {
                            number: s.deliveryNumber, invoiceNumber: s.invoiceNumber, date: s.date,
                            buyer: s.buyerName || s.recipient, salesPerson: s.salesPerson,
                            subtotal: Number(s.subtotal || 0) + itemDiscounts, discount: Number(s.totalDiscount || 0) + itemDiscounts,
                            tax: Number(s.taxAmount || 0), grandTotal: Number(s.grandTotal || 0),
                            paidAmount: Number(s.paidAmount || 0), paymentStatus: s.paymentStatus,
                            totalQty: (s.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0),
                            hpp: saleHpp,
                            margin: margin,
                            marginPct: marginPct
                        };
                    });
                    purchaseDetail = purchases.map(function (p) { return ({
                        number: p.receiptNumber, date: p.date,
                        supplier: p.receivedFrom, salesPerson: p.salesPerson,
                        subtotal: Number(p.subtotal || 0), discount: Number(p.totalDiscount || 0),
                        tax: Number(p.taxAmount || 0), grandTotal: Number(p.grandTotal || 0),
                        paidAmount: Number(p.paidAmount || 0), paymentStatus: p.paymentStatus
                    }); });
                    opsDetail = allOperational.map(function (o) { return ({
                        date: o.date, description: o.description,
                        bank: o.bank, category: o.category || o.transactionType,
                        amount: Number(o.amount || 0), salesPerson: o.salesPerson,
                        referenceNumber: o.referenceNumber
                    }); });
                    monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                    financeActivity = new Map();
                    for (_i = 0, allOperational_1 = allOperational; _i < allOperational_1.length; _i++) {
                        o = allOperational_1[_i];
                        userName = ((_d = o.createdBy) === null || _d === void 0 ? void 0 : _d.name) || ((_e = o.createdBy) === null || _e === void 0 ? void 0 : _e.email) || 'System';
                        if (!financeActivity.has(userName)) {
                            financeActivity.set(userName, { name: userName, count: 0, paymentAmount: 0, receiptAmount: 0 });
                        }
                        act = financeActivity.get(userName);
                        act.count++;
                        if (o.transactionType === 'PAYMENT' || Number(o.amount) < 0) {
                            act.paymentAmount += Math.abs(Number(o.amount || 0));
                        }
                        else {
                            act.receiptAmount += Math.abs(Number(o.amount || 0));
                        }
                    }
                    warehouseActivity = new Map();
                    for (_b = 0, purchases_5 = purchases; _b < purchases_5.length; _b++) {
                        p = purchases_5[_b];
                        creatorName = ((_f = p.createdBy) === null || _f === void 0 ? void 0 : _f.name) || ((_g = p.createdBy) === null || _g === void 0 ? void 0 : _g.email) || 'System';
                        if (!warehouseActivity.has(creatorName)) {
                            warehouseActivity.set(creatorName, { name: creatorName, createdCount: 0, verifiedCount: 0, totalQtyReceived: 0 });
                        }
                        warehouseActivity.get(creatorName).createdCount++;
                    }
                    for (_c = 0, purchases_6 = purchases; _c < purchases_6.length; _c++) {
                        p = purchases_6[_c];
                        if (p.isVerified && p.verifiedBy) {
                            verifierName = p.verifiedBy;
                            if (!warehouseActivity.has(verifierName)) {
                                warehouseActivity.set(verifierName, { name: verifierName, createdCount: 0, verifiedCount: 0, totalQtyReceived: 0 });
                            }
                            act = warehouseActivity.get(verifierName);
                            act.verifiedCount++;
                            act.totalQtyReceived += (p.items || []).reduce(function (sum, item) { return sum + Number(item.quantity || 0); }, 0);
                        }
                    }
                    return [2 /*return*/, {
                            staffActivity: {
                                finance: Array.from(financeActivity.values()),
                                warehouse: Array.from(warehouseActivity.values())
                            },
                            period: {
                                month: filterMonth, year: filterYear,
                                label: "".concat(monthNames[filterMonth - 1], " ").concat(filterYear)
                            },
                            profitLoss: {
                                revenue: totalRevenue,
                                revenueSubtotal: totalRevenueSubtotal,
                                discount: totalDiscount,
                                salesTax: totalSalesTax,
                                hpp: totalHPP,
                                grossProfit: grossProfit,
                                grossMarginPct: Number(grossMarginPct.toFixed(1)),
                                expenses: totalExpenses,
                                companyExpenses: companyExpenses,
                                netProfit: netProfit,
                                netMarginPct: Number(netMarginPct.toFixed(1)),
                                expenseByCategory: expenseByCategory
                            },
                            purchases: {
                                total: netPurchases,
                                subtotal: netPurchasesSubtotal,
                                count: purchases.length
                            },
                            salesByTeam: { BC: salesBC_2, PF: salesPF_2, Other: salesOther_2 },
                            arAging: arAging,
                            apAging: apAging,
                            topBuyers: topBuyers,
                            topSuppliers: topSuppliers,
                            returnPurchaseSummary: returnPurchaseSummary,
                            returnSalesSummary: returnSalesSummary,
                            dailyBreakdown: dailyBreakdown,
                            details: {
                                sales: salesDetail,
                                purchases: purchaseDetail,
                                operational: opsDetail,
                                monthlyTraceability: monthlyTraceability_1
                            },
                            stats: {
                                salesCount: sales.length,
                                purchaseCount: purchases.length,
                                opsCount: allOperational.length,
                                totalSalesQty: sales.reduce(function (s, d) {
                                    return s + (d.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0);
                                }, 0),
                                totalPurchaseQty: purchases.reduce(function (s, d) {
                                    return s + (d.items || []).reduce(function (q, i) { return q + Number(i.quantity || 0); }, 0);
                                }, 0)
                            }
                        }];
                case 3:
                    error_7 = _h.sent();
                    console.error('[getComprehensiveMonthlyReportService] ERROR:', error_7);
                    return [2 /*return*/, { error: error_7.message || 'Failed to generate monthly report' }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function reallocateLotService(sdItemId, newLotId) {
    return __awaiter(this, void 0, void 0, function () {
        var prisma, saleItem, targetLot, existingAllocations;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = (0, prisma_1.getPrisma)();
                    if (!prisma)
                        throw new Error("Prisma client is not available");
                    return [4 /*yield*/, prisma.salesDeliveryItem.findUnique({
                            where: { id: sdItemId }
                        })];
                case 1:
                    saleItem = _a.sent();
                    if (!saleItem)
                        throw new Error("Sale item not found");
                    return [4 /*yield*/, prisma.productLot.findUnique({
                            where: { id: newLotId }
                        })];
                case 2:
                    targetLot = _a.sent();
                    if (!targetLot)
                        throw new Error("Target lot not found");
                    return [4 /*yield*/, prisma.lotAllocation.findMany({
                            where: { sdItemId: saleItem.id }
                        })];
                case 3:
                    existingAllocations = _a.sent();
                    // Run transaction to ensure atomicity
                    return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var _i, existingAllocations_1, alloc;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _i = 0, existingAllocations_1 = existingAllocations;
                                        _a.label = 1;
                                    case 1:
                                        if (!(_i < existingAllocations_1.length)) return [3 /*break*/, 4];
                                        alloc = existingAllocations_1[_i];
                                        return [4 /*yield*/, tx.productLot.update({
                                                where: { id: alloc.lotId },
                                                data: { remainingQty: { increment: alloc.qty } }
                                            })];
                                    case 2:
                                        _a.sent();
                                        _a.label = 3;
                                    case 3:
                                        _i++;
                                        return [3 /*break*/, 1];
                                    case 4: 
                                    // 2. Delete existing lot allocation(s) for this sale item
                                    return [4 /*yield*/, tx.lotAllocation.deleteMany({
                                            where: { sdItemId: saleItem.id }
                                        })];
                                    case 5:
                                        // 2. Delete existing lot allocation(s) for this sale item
                                        _a.sent();
                                        // 3. Create new lot allocation
                                        return [4 /*yield*/, tx.lotAllocation.create({
                                                data: {
                                                    sdItemId: saleItem.id,
                                                    lotId: targetLot.id,
                                                    qty: saleItem.quantity,
                                                    hppAtTime: targetLot.purchasePrice
                                                }
                                            })];
                                    case 6:
                                        // 3. Create new lot allocation
                                        _a.sent();
                                        // 4. Deduct qty from new lot
                                        return [4 /*yield*/, tx.productLot.update({
                                                where: { id: targetLot.id },
                                                data: { remainingQty: { decrement: saleItem.quantity } }
                                            })];
                                    case 7:
                                        // 4. Deduct qty from new lot
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 4:
                    // Run transaction to ensure atomicity
                    _a.sent();
                    return [2 /*return*/, true];
            }
        });
    });
}
function getCrossDivisionSalesService(month, year) {
    return __awaiter(this, void 0, void 0, function () {
        var prisma, dateFilter, startDate, endDate, allocations, pfToBc, bcToPf, pfToBcAmount, bcToPfAmount, _i, allocations_1, alloc, seller, buyer, qty, purchasePrice, totalCost, error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prisma = (0, prisma_1.getPrisma)();
                    dateFilter = undefined;
                    if (month > 0 && year > 0) {
                        startDate = new Date(year, month - 1, 1);
                        endDate = new Date(year, month, 0, 23, 59, 59, 999);
                        dateFilter = { gte: startDate, lte: endDate };
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, prisma.lotAllocation.findMany({
                            where: {
                                sdItem: {
                                    delivery: __assign(__assign({}, (dateFilter ? { date: dateFilter } : {})), { isVoid: false })
                                }
                            },
                            include: {
                                sdItem: {
                                    include: {
                                        delivery: true,
                                        product: true
                                    }
                                },
                                lot: {
                                    include: {
                                        grItem: {
                                            include: {
                                                receipt: true
                                            }
                                        }
                                    }
                                }
                            }
                        })];
                case 2:
                    allocations = _a.sent();
                    pfToBc = [];
                    bcToPf = [];
                    pfToBcAmount = 0;
                    bcToPfAmount = 0;
                    for (_i = 0, allocations_1 = allocations; _i < allocations_1.length; _i++) {
                        alloc = allocations_1[_i];
                        if (!alloc.sdItem || !alloc.lot || !alloc.lot.grItem || !alloc.lot.grItem.receipt)
                            continue;
                        seller = alloc.sdItem.delivery.salesPerson;
                        buyer = alloc.lot.grItem.receipt.salesPerson;
                        qty = alloc.qty;
                        purchasePrice = Number(alloc.lot.grItem.purchasePrice || alloc.sdItem.product.purchasePrice || 0);
                        totalCost = qty * purchasePrice;
                        if (seller === 'BC' && buyer === 'PF') {
                            pfToBc.push({
                                id: alloc.id,
                                deliveryId: alloc.sdItem.delivery.id,
                                product: alloc.sdItem.product.name,
                                sku: alloc.sdItem.product.sku,
                                qty: qty,
                                sj: alloc.sdItem.delivery.deliveryNumber,
                                sjDate: alloc.sdItem.delivery.date,
                                lpb: alloc.lot.grItem.receipt.receiptNumber,
                                lpbDate: alloc.lot.grItem.receipt.date,
                                cost: totalCost,
                                price: purchasePrice
                            });
                            pfToBcAmount += totalCost;
                        }
                        else if (seller === 'PF' && buyer === 'BC') {
                            bcToPf.push({
                                id: alloc.id,
                                deliveryId: alloc.sdItem.delivery.id,
                                product: alloc.sdItem.product.name,
                                sku: alloc.sdItem.product.sku,
                                qty: qty,
                                sj: alloc.sdItem.delivery.deliveryNumber,
                                sjDate: alloc.sdItem.delivery.date,
                                lpb: alloc.lot.grItem.receipt.receiptNumber,
                                lpbDate: alloc.lot.grItem.receipt.date,
                                cost: totalCost,
                                price: purchasePrice
                            });
                            bcToPfAmount += totalCost;
                        }
                    }
                    return [2 /*return*/, {
                            pfToBc: pfToBc,
                            bcToPf: bcToPf,
                            pfToBcAmount: pfToBcAmount,
                            bcToPfAmount: bcToPfAmount
                        }];
                case 3:
                    error_8 = _a.sent();
                    console.error('[getCrossDivisionSalesService] ERROR:', error_8);
                    return [2 /*return*/, { error: error_8.message || 'Failed to generate cross division report' }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function autoFixCrossTransactionService(deliveryId, correctSalesPerson) {
    return __awaiter(this, void 0, void 0, function () {
        var prisma, items, isMixed, mixedCount, _i, items_1, item, _a, _b, alloc, receiptSalesPerson;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    prisma = (0, prisma_1.getPrisma)();
                    return [4 /*yield*/, prisma.salesDeliveryItem.findMany({
                            where: { deliveryId: deliveryId },
                            include: {
                                lotAllocations: {
                                    include: {
                                        lot: {
                                            include: {
                                                grItem: {
                                                    include: {
                                                        receipt: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        })];
                case 1:
                    items = _c.sent();
                    isMixed = false;
                    mixedCount = 0;
                    for (_i = 0, items_1 = items; _i < items_1.length; _i++) {
                        item = items_1[_i];
                        for (_a = 0, _b = item.lotAllocations; _a < _b.length; _a++) {
                            alloc = _b[_a];
                            receiptSalesPerson = alloc.lot.grItem.receipt.salesPerson;
                            if (receiptSalesPerson && receiptSalesPerson !== correctSalesPerson) {
                                isMixed = true;
                                mixedCount += alloc.qty;
                            }
                        }
                    }
                    // Update the sales delivery forcefully to the correct sales person (Majority)
                    return [4 /*yield*/, prisma.salesDelivery.update({
                            where: { id: deliveryId },
                            data: { salesPerson: correctSalesPerson }
                        })];
                case 2:
                    // Update the sales delivery forcefully to the correct sales person (Majority)
                    _c.sent();
                    if (isMixed) {
                        return [2 /*return*/, {
                                success: true,
                                warning: "Berhasil dikoreksi ke ".concat(correctSalesPerson, ". Peringatan: Ada ").concat(mixedCount, " pcs barang yang modalnya diambil dari divisi lawan. Transaksi ini akan berbalik menjadi silang sebagian.")
                            }];
                    }
                    return [2 /*return*/, { success: true }];
            }
        });
    });
}

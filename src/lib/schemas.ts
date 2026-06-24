import { z } from "zod";

export const SalesDeliverySchema = z.object({
    deliveryNumber: z.string().optional(),
    orderId: z.string().optional().nullable(),
    buyerName: z.string().min(1, "Nama pembeli wajib diisi"),
    recipient: z.string().min(1, "Penerima wajib diisi"),
    warehouseId: z.string().min(1, "Gudang wajib dipilih"),
    salesPerson: z.string().optional().nullable(),
    vehicleNumber: z.string().optional(),
    poNumber: z.string().optional(),
    isPKP: z.boolean().optional(),
    taxRate: z.coerce.number().optional(),
    totalDiscount: z.coerce.number().optional(),
    createdAt: z.date().optional().or(z.string().transform(val => new Date(val))),
    items: z.array(z.object({
        productId: z.string().min(1),
        selectedLotId: z.string().optional(),
        quantity: z.coerce.number().positive("Jumlah harus lebih dari 0"),
        salesPrice: z.coerce.number().optional(),
        discount: z.coerce.number().optional(),
        uom: z.string().optional(),
        vendorName: z.string().optional(),
        orderItemId: z.string().optional().nullable(),
    })).min(1, "Minimal harus ada satu barang"),
});

export const SalesOrderSchema = z.object({
    orderNumber: z.string().optional(),
    buyerName: z.string().min(1, "Nama pembeli wajib diisi"),
    recipient: z.string().min(1, "Penerima wajib diisi"),
    warehouseId: z.string().min(1, "Gudang wajib dipilih"),
    salesPerson: z.string().optional().nullable(),
    date: z.date().optional().or(z.string().transform(val => new Date(val))),
    status: z.string().optional(),
    taxRate: z.coerce.number().optional(),
    totalDiscount: z.coerce.number().optional(),
    items: z.array(z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().positive(),
        salesPrice: z.coerce.number().positive(),
        discount: z.coerce.number().optional(),
        uom: z.string().optional(),
        vendorName: z.string().optional(),
    })).min(1),
});

export const GoodsReceiptSchema = z.object({
    receiptNumber: z.string().optional(),
    receivedFrom: z.string().min(1),
    warehouseId: z.string().min(1),
    date: z.date().optional().or(z.string().transform(val => new Date(val))),
    items: z.array(z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().positive(),
        purchasePrice: z.coerce.number().min(0),
        uom: z.string().optional(),
    })).min(1),
});


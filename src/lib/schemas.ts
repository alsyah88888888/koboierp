import { z } from "zod";

export const SalesDeliverySchema = z.object({
    deliveryNumber: z.string().min(1, "Nomor jalan wajib diisi"),
    buyerName: z.string().min(1, "Nama pembeli wajib diisi"),
    recipient: z.string().min(1, "Penerima wajib diisi"),
    warehouseId: z.string().min(1, "Gudang wajib dipilih"),
    salesPerson: z.string().optional(),
    vehicleNumber: z.string().optional(),
    items: z.array(z.object({
        productId: z.string().min(1),
        quantity: z.number().positive("Jumlah harus lebih dari 0"),
        salesPrice: z.number().optional(),
        uom: z.string().optional(),
    })).min(1, "Minimal harus ada satu barang"),
});

export const SalesOrderSchema = z.object({
    orderNumber: z.string().min(1, "Nomor pesanan wajib diisi"),
    buyerName: z.string().min(1, "Nama pembeli wajib diisi"),
    recipient: z.string().min(1, "Penerima wajib diisi"),
    warehouseId: z.string().min(1, "Gudang wajib dipilih"),
    items: z.array(z.object({
        productId: z.string().min(1),
        quantity: z.number().positive(),
        salesPrice: z.number().positive(),
        uom: z.string().optional(),
    })).min(1),
});

export const GoodsReceiptSchema = z.object({
    receiptNumber: z.string().min(1),
    receivedFrom: z.string().min(1),
    warehouseId: z.string().min(1),
    items: z.array(z.object({
        productId: z.string().min(1),
        quantity: z.number().positive(),
        purchasePrice: z.number().min(0),
    })).min(1),
});

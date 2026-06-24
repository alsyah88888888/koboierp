const fs = require('fs');
let content = fs.readFileSync('src/actions/purchase.ts', 'utf8');

// 1. Update createPurchaseRequest
const targetCreate = `export async function createPurchaseRequest(data: {
    notes?: string;
    items: { itemName: string; quantity: number; estimatedPrice: number }[];
    category?: string;
    salesPerson?: string;
}) {`;

const replaceCreate = `export async function createPurchaseRequest(data: {
    notes?: string;
    items: { itemName: string; quantity: number; estimatedPrice: number }[];
    category?: string;
    salesPerson?: string;
    invoiceNumber?: string;
    receiptNumber?: string;
}) {`;

content = content.replace(targetCreate, replaceCreate);

const targetCreateData = `                notes: data.notes || "",
                category: data.category,
                salesPerson: data.salesPerson,
                items: {`;

const replaceCreateData = `                notes: data.notes || "",
                category: data.category,
                salesPerson: data.salesPerson,
                invoiceNumber: data.invoiceNumber,
                receiptNumber: data.receiptNumber,
                items: {`;

content = content.replace(targetCreateData, replaceCreateData);

// 2. Update updatePurchaseRequest
const targetUpdate = `export async function updatePurchaseRequest(id: string, data: {
    notes?: string;
    items: { id?: string; itemName: string; quantity: number; estimatedPrice: number }[];
    category?: string;
    salesPerson?: string;
}) {`;

const replaceUpdate = `export async function updatePurchaseRequest(id: string, data: {
    notes?: string;
    items: { id?: string; itemName: string; quantity: number; estimatedPrice: number }[];
    category?: string;
    salesPerson?: string;
    invoiceNumber?: string;
    receiptNumber?: string;
}) {`;

content = content.replace(targetUpdate, replaceUpdate);

const targetUpdateData = `                notes: data.notes || "",
                category: data.category,
                salesPerson: data.salesPerson,
                items: {`;

const replaceUpdateData = `                notes: data.notes || "",
                category: data.category,
                salesPerson: data.salesPerson,
                invoiceNumber: data.invoiceNumber,
                receiptNumber: data.receiptNumber,
                items: {`;

content = content.replace(targetUpdateData, replaceUpdateData);

fs.writeFileSync('src/actions/purchase.ts', content);
console.log("Updated purchase.ts actions");

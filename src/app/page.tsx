import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { AdminDashboard } from "./AdminDashboard";
import {
  Wallet,
  ShoppingCart,
  ShoppingBag,
  Package
} from "lucide-react";

export default async function DashboardPage() {
  // 1. Fetch Basic Totals
  const accounts = await prisma.financeAccount.findMany({ include: { journals: true } }).catch(() => []);
  const receipts = await prisma.goodsReceipt.findMany({ include: { items: true } }).catch(() => []);
  const sales = await prisma.salesDelivery.findMany({ include: { items: true } }).catch(() => []);
  const products = await prisma.product.findMany({ include: { stocks: true } }).catch(() => []);

  // 2. Calculate KPI Stats
  const totalBalance = accounts.reduce((sum: number, acc: any) => {
    const accBalance = (acc.journals as any[]).reduce((b: number, j: any) => {
      if (j.type === "DEBIT") return b + Number(j.amount);
      return b - Number(j.amount);
    }, 0);
    return sum + (acc.type === 'ASSET' ? accBalance : 0);
  }, 0);

  const totalRevenue = sales.reduce((sum: number, s: any) => sum + s.items.reduce((iSum: number, item: any) => iSum + (Number(item.salesPrice || 0) * item.quantity), 0), 0);
  const totalPurchases = receipts.reduce((sum: number, r: any) => sum + r.items.reduce((iSum: number, item: any) => iSum + (Number(item.purchasePrice || 0) * item.quantity), 0), 0);
  const totalStockQty = products.reduce((sum: number, p: any) => sum + p.stocks.reduce((sSum: number, s: any) => sSum + s.quantity, 0), 0);

  const stats = [
    {
      name: "Total Revenue",
      value: formatCurrency(totalRevenue),
      change: "+12.5%", trend: 'up',
      iconName: "ShoppingBag", iconBg: "bg-blue-50", iconColor: "text-blue-500"
    },
    {
      name: "Asset Value",
      value: formatCurrency(totalBalance),
      change: "+3.2%", trend: 'up',
      iconName: "Wallet", iconBg: "bg-emerald-50", iconColor: "text-emerald-500"
    },
    {
      name: "Purchase Vol.",
      value: formatCurrency(totalPurchases),
      change: "-2.1%", trend: 'down',
      iconName: "ShoppingCart", iconBg: "bg-amber-50", iconColor: "text-amber-500"
    },
    {
      name: "Current Stock",
      value: totalStockQty.toLocaleString(),
      change: "+5.1%", trend: 'up',
      iconName: "Package", iconBg: "bg-slate-50", iconColor: "text-slate-500"
    },
  ];

  // 3. Prepare Chart Data (Mocking last 7 days distribution)
  const salesData = [
    { name: 'Mon', sales: 4000, purchases: 2400 },
    { name: 'Tue', sales: 3000, purchases: 1398 },
    { name: 'Wed', sales: 2000, purchases: 9800 },
    { name: 'Thu', sales: 2780, purchases: 3908 },
    { name: 'Fri', sales: 1890, purchases: 4800 },
    { name: 'Sat', sales: 2390, purchases: 3800 },
    { name: 'Sun', sales: 3490, purchases: 4300 },
  ];

  // 4. Group Inventory by Category
  const categoryMap: any = {};
  products.forEach((p: any) => {
    const cat = p.category || "Uncategorized";
    const qty = p.stocks.reduce((s: number, st: any) => s + st.quantity, 0);
    categoryMap[cat] = (categoryMap[cat] || 0) + qty;
  });

  const inventoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value })).slice(0, 5);

  // 5. Fetch Recent Activity
  const recentJournal = await prisma.journalEntry.findMany({
    take: 5,
    orderBy: { date: 'desc' }
  });

  const recentActivity = recentJournal.map((j: any) => ({
    type: j.type === 'CREDIT' ? 'SALE' : 'PURCHASE',
    description: j.description,
    amount: Number(j.amount),
    date: new Date(j.date).toLocaleDateString('id-ID'),
    reference: "GL-" + j.id.slice(-4).toUpperCase()
  }));

  return <AdminDashboard
    stats={stats}
    salesData={salesData}
    inventoryData={inventoryData}
    recentActivity={recentActivity}
  />;
}

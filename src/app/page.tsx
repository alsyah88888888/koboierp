import prisma from "@/lib/prisma";
import { getDashboardSummaryAction } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";
import { AdminDashboard } from "./AdminDashboard";
import {
  Wallet,
  ShoppingCart,
  ShoppingBag,
  Package
} from "lucide-react";

export default async function DashboardPage() {
  // 2. Fetch Data via Server Action
  const summary = await getDashboardSummaryAction();
  const products = await prisma.product.findMany({ include: { stocks: true } }).catch(() => []);

  const stats = [
    {
      name: "Total Revenue",
      value: formatCurrency(summary.totalRevenue),
      change: "Berdasarkan Penjualan", trend: 'up',
      iconName: "ShoppingBag", iconBg: "bg-blue-50", iconColor: "text-blue-500"
    },
    {
      name: "Cash/Bank Balance",
      value: formatCurrency(summary.cashBalance),
      change: "Saldo Bank BCA", trend: 'up',
      iconName: "Wallet", iconBg: "bg-emerald-50", iconColor: "text-emerald-500"
    },
    {
      name: "Total Hutang (Pending)",
      value: formatCurrency(summary.totalHutang),
      change: "Belum Dibayar", trend: 'down',
      iconName: "ShoppingCart", iconBg: "bg-amber-50", iconColor: "text-amber-500"
    },
    {
      name: "Total Piutang (Pending)",
      value: formatCurrency(summary.totalPiutang),
      change: "Belum Diterima", trend: 'up',
      iconName: "Package", iconBg: "bg-rose-50", iconColor: "text-rose-500"
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

export const dynamic = 'force-dynamic';

import prisma from "@/lib/prisma";
import { getDashboardSummaryAction, getDailyReportAction } from "@/app/actions";
import { formatCurrency } from "@/lib/utils";
import { AdminDashboard } from "./AdminDashboard";
import {
  Wallet,
  ShoppingCart,
  ShoppingBag,
  Package
} from "lucide-react";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { headers } from "next/headers";

export default async function DashboardPage() {
  // Force dynamic rendering to avoid build-time DB check
  await headers();
  
  const session = await getServerSession(authOptions) as any;
  const userRole = session?.user?.role || "USER";
  const isWarehouse = userRole === "WAREHOUSE";

  // 2. Fetch Data via Server Action
  let summary: any = { totalRevenue: 0, nettMarginSales: 0, nettMarginBC: 0, nettMarginPF: 0, cashBalance: 0, totalHutang: 0, totalPiutang: 0, lowStockCount: 0, activeOrdersToday: 0, weeklyStats: [] };
  let dailyReport: any = { sales: [], purchases: [], operational: [], requests: [], dailyStats: {} };
  let products: any[] = [];
  let recentActivity: any[] = [];
  let inventoryData: any[] = [];

  try {
    const [summaryRes, reportRes, productsRes, recentJournal] = await Promise.all([
      getDashboardSummaryAction().catch(e => { console.error("Summary Error:", e); return summary; }),
      getDailyReportAction().catch(e => { console.error("Report Error:", e); return dailyReport; }),
      prisma.product.findMany({ include: { stocks: true } }).catch(() => []),
      prisma.journalEntry.findMany({ take: 5, orderBy: { date: 'desc' } }).catch(() => [])
    ]);

    summary = summaryRes || summary;
    dailyReport = reportRes || dailyReport;
    products = productsRes || [];

    // 4. Group Inventory by Category
    const categoryMap: any = {};
    products.forEach((p: any) => {
      const cat = p.category || "Uncategorized";
      const stocks = p.stocks || [];
      const qty = stocks.reduce((s: number, st: any) => s + (Number(st.quantity) || 0), 0);
      categoryMap[cat] = (categoryMap[cat] || 0) + qty;
    });
    inventoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value: Number(value) })).slice(0, 5);

    recentActivity = (recentJournal || []).map((j: any) => ({
      type: j.type === 'CREDIT' ? 'SALE' : 'PURCHASE',
      description: j.description || "No Description",
      amount: Number(j.amount || 0),
      date: j.date ? new Date(j.date).toLocaleDateString('id-ID') : "-",
      reference: "GL-" + (j.id?.slice(-4).toUpperCase() || "0000")
    }));
  } catch (err) {
    console.error("Dashboard Page Error:", err);
  }

  const stats = [
    {
      name: "Total Revenue",
      value: formatCurrency(summary.totalRevenue || 0),
      change: "Berdasarkan Penjualan", trend: 'up',
      iconName: "ShoppingBag", iconBg: "bg-blue-50", iconColor: "text-blue-500"
    },
    {
      name: "Nett Margin Sales",
      value: formatCurrency(summary.nettMarginSales || 0),
      change: "Revenue - COGS - Exp", trend: (summary.nettMarginSales || 0) > 0 ? 'up' : 'down',
      iconName: "TrendingUp", iconBg: "bg-indigo-50", iconColor: "text-indigo-500"
    },
    {
      name: "Margin BC",
      value: formatCurrency(summary.nettMarginBC || 0),
      change: "Sales Team BC", trend: (summary.nettMarginBC || 0) > 0 ? 'up' : 'down',
      iconName: "TrendingUp", iconBg: "bg-orange-50", iconColor: "text-orange-500"
    },
    {
      name: "Margin PF",
      value: formatCurrency(summary.nettMarginPF || 0),
      change: "Sales Team PF", trend: (summary.nettMarginPF || 0) > 0 ? 'up' : 'down',
      iconName: "TrendingUp", iconBg: "bg-purple-50", iconColor: "text-purple-500"
    },
    {
      name: "Cash/Bank Balance",
      value: formatCurrency(summary.cashBalance || 0),
      change: "Saldo Bank BCA", trend: 'up',
      iconName: "Wallet", iconBg: "bg-emerald-50", iconColor: "text-emerald-500"
    },
    {
      name: "Total Hutang (Pending)",
      value: formatCurrency(summary.totalHutang || 0),
      change: "Belum Dibayar", trend: 'down',
      iconName: "ShoppingCart", iconBg: "bg-amber-50", iconColor: "text-amber-500"
    },
    {
      name: "Total Piutang (Pending)",
      value: formatCurrency(summary.totalPiutang || 0),
      change: "Belum Diterima", trend: 'up',
      iconName: "Package", iconBg: "bg-rose-50", iconColor: "text-rose-500"
    },
  ].filter(stat => {
    if (isWarehouse) {
      if (['Total Revenue', 'Nett Margin Sales', 'Margin BC', 'Margin PF', 'Cash/Bank Balance', 'Total Hutang (Pending)', 'Total Piutang (Pending)'].includes(stat.name)) {
        return false;
      }
    }
    return true;
  });

  return <AdminDashboard
    role={userRole}
    stats={stats}
    salesData={summary.weeklyStats || []}
    inventoryData={inventoryData}
    recentActivity={recentActivity}
    dailyReport={dailyReport}
    lowStockCount={summary.lowStockCount || 0}
    activeOrdersToday={summary.activeOrdersToday || 0}
  />;
}

import { getPrisma } from "@/lib/prisma";
import { getDashboardSummaryAction, getDailyReportAction } from "@/actions/system";
import { formatCurrency, serializeDecimal } from "@/lib/utils";
import { AdminDashboard } from "./AdminDashboard";
import {
  Wallet,
  ShoppingCart,
  ShoppingBag,
  Package
} from "lucide-react";

import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  // Force dynamic rendering to avoid build-time DB check
  await headers();
  
  const prisma = getPrisma();
  const session = await getServerSession(getAuthOptions()) as any;

  if (!session) {
    redirect("/api/auth/signin");
  }



  const userRole = session?.user?.role || "USER";
  const isWarehouse = userRole === "WAREHOUSE";

  // 2. Fetch Data via Server Action
  let summary: any = { totalRevenue: 0, nettMarginSales: 0, nettMarginBC: 0, nettMarginPF: 0, cashBalance: 0, totalHutang: 0, totalPiutang: 0, lowStockCount: 0, activeOrdersToday: 0, weeklyStats: [] };
  let dailyReport: any = { sales: [], purchases: [], operational: [], requests: [], dailyStats: {} };
  let products: any[] = [];
  let recentActivity: any[] = [];
  let inventoryData: any[] = [];
  let lowStockProducts: any[] = [];

  try {
    const [summaryRes, reportRes, productsRes, recentJournal] = await Promise.all([
      getDashboardSummaryAction().then((res: any) => serializeDecimal(res)).catch((e: any) => { console.error("Summary Error:", e); return summary; }),
      getDailyReportAction().then((res: any) => serializeDecimal(res)).catch((e: any) => { console.error("Report Error:", e); return dailyReport; }),
      prisma.product.findMany({ include: { stocks: true } }).then((res: any) => serializeDecimal(res)).catch(() => []),
      prisma.journalEntry.findMany({ take: 5, orderBy: { date: 'desc' } }).then((res: any) => serializeDecimal(res)).catch(() => [])
    ]);

    summary = summaryRes || summary;
    dailyReport = reportRes || dailyReport;
    products = productsRes || [];

    // 4. Group Inventory by Category & Check Low Stock
    const categoryMap: any = {};
    products.forEach((p: any) => {
      const cat = p.category || "Uncategorized";
      const stocks = p.stocks || [];
      const totalQty = stocks.reduce((s: number, st: any) => s + (Number(st.quantity) || 0), 0);
      categoryMap[cat] = (categoryMap[cat] || 0) + totalQty;

      if (totalQty <= (p.lowStockThreshold || 10) && totalQty > 0) {
        lowStockProducts.push({
          id: p.id,
          sku: p.sku,
          name: p.name,
          stock: totalQty,
          threshold: p.lowStockThreshold || 10
        });
      }
    });
    inventoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value: Number(value) })).slice(0, 5);

    recentActivity = (recentJournal || []).map((j: any) => ({
      type: j.type === 'CREDIT' ? 'SALE' : 'PURCHASE',
      description: j.description || "No Description",
      amount: Number(j.amount || 0),
      date: j.date,
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
    // Specific filter for 'Bu Cici'
    if (session?.user?.email === 'cici@kolaborasi.id') {
      if (stat.name === 'Margin PF') return false;
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
    lowStockProducts={lowStockProducts}
    activeOrdersToday={summary.activeOrdersToday || 0}
    totalPaidSales={summary.totalPaidSales || 0}
    totalPaidPurchases={summary.totalPaidPurchases || 0}
    totalPiutangPending={summary.totalPiutangPending || 0}
    totalHutangPending={summary.totalHutangPending || 0}
  />;
}

import { headers } from "next/headers";
import { formatCurrency, serializeDecimal } from "@/lib/utils";
import { getDashboardSummaryService, getTraceabilitySummaryService } from "@/lib/services/system-service";
import { getPrisma } from "@/lib/prisma";
import { PublicDashboard } from "./PublicDashboard";

export const dynamic = "force-dynamic";

// In-memory cache untuk public dashboard agar tidak membebani server
const globalCache = (global as any) || {};
const CACHE_KEY = "PUBLIC_DASHBOARD_CACHE";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 menit cache
export default async function PublicDashboardPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  await headers();

  // ── Token Validation ──────────────────────────────────────────────────
  const validToken = process.env.PUBLIC_DASHBOARD_TOKEN || "kolaboarsi2026";
  const inputToken = searchParams?.token || "";

  if (inputToken !== validToken) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4 px-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-white font-black text-xl">Akses Ditolak</h1>
          <p className="text-slate-400 text-sm">Link tidak valid atau sudah kadaluarsa.</p>
          <p className="text-slate-600 text-xs uppercase tracking-widest font-bold">PT. KOLA BORASI INDONESIA</p>
        </div>
      </div>
    );
  }

  // ── Fetch Data (bypass session — public access) ───────────────────────
  const nowMs = Date.now();
  if (globalCache[CACHE_KEY] && (nowMs - globalCache[CACHE_KEY].timestamp < CACHE_TTL_MS)) {
    // Return dari cache jika masih valid
    const cached = globalCache[CACHE_KEY].data;
    return (
      <PublicDashboard
        stats={cached.stats}
        weeklyStats={cached.summary.weeklyStats || []}
        dailyReport={cached.dailyReport}
        traceabilityData={cached.traceabilityData}
      />
    );
  }

  const prisma = getPrisma();

  let summary: any = {
    totalRevenue: 0, nettMarginSales: 0, nettMarginBC: 0, nettMarginPF: 0,
    cashBalance: 0, totalHutang: 0, totalPiutang: 0, weeklyStats: []
  };
  let dailyReport: any = { sales: [], purchases: [] };
  let traceabilityData: any = null;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [summaryRes, salesRes, purchasesRes, traceRes] = await Promise.all([
      // Call service directly with admin=true to get full data
      getDashboardSummaryService("public", "", true).then((r: any) => serializeDecimal(r)).catch(() => summary),
      // Today's sales
      prisma.salesDelivery.findMany({
        where: { createdAt: { gte: today, lt: tomorrow }, isVoid: false },
        orderBy: { createdAt: "desc" },
        take: 50,
      }).catch(() => []),
      // Today's purchases
      prisma.goodsReceipt.findMany({
        where: { createdAt: { gte: today, lt: tomorrow }, isVoid: false },
        orderBy: { createdAt: "desc" },
        take: 50,
      }).catch(() => []),
      // Traceability summary
      getTraceabilitySummaryService().catch(() => null),
    ]);

    summary = summaryRes || summary;
    dailyReport = {
      sales: serializeDecimal(salesRes || []),
      purchases: serializeDecimal(purchasesRes || []),
    };
    traceabilityData = traceRes;
  } catch (err) {
    console.error("Public Dashboard Error:", err);
  }

  const stats = [
    { name: "Total Revenue", value: formatCurrency(summary.totalRevenue || 0), sub: "Berdasarkan Penjualan", trend: "up", color: "blue" },
    { name: "Nett Margin", value: formatCurrency(summary.nettMarginSales || 0), sub: "Revenue - HPP - Operasional", trend: (summary.nettMarginSales || 0) >= 0 ? "up" : "down", color: "indigo" },
    { name: "Margin BC", value: formatCurrency(summary.nettMarginBC || 0), sub: "Sales Team BC", trend: (summary.nettMarginBC || 0) >= 0 ? "up" : "down", color: "orange" },
    { name: "Margin PF", value: formatCurrency(summary.nettMarginPF || 0), sub: "Sales Team PF", trend: (summary.nettMarginPF || 0) >= 0 ? "up" : "down", color: "purple" },
    { name: "Saldo Bank", value: formatCurrency(summary.cashBalance || 0), sub: "Saldo Bank BCA", trend: "up", color: "emerald" },
    { name: "Total Piutang", value: formatCurrency(summary.totalPiutang || 0), sub: "Belum Diterima", trend: "up", color: "sky" },
    { name: "Total Hutang", value: formatCurrency(summary.totalHutang || 0), sub: "Belum Dibayar", trend: "down", color: "amber" },
  ];

  // Simpan ke cache
  globalCache[CACHE_KEY] = {
    timestamp: Date.now(),
    data: { stats, summary, dailyReport, traceabilityData }
  };

  return (
    <PublicDashboard
      stats={stats}
      weeklyStats={summary.weeklyStats || []}
      dailyReport={dailyReport}
      traceabilityData={traceabilityData}
    />
  );
}

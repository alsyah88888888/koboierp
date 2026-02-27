"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from "recharts";
import {
    TrendingUp,
    TrendingDown,
    Package,
    ShoppingCart,
    ShoppingBag,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Bell
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const IconMap: any = {
    ShoppingBag,
    Wallet,
    ShoppingCart,
    Package
};

export function AdminDashboard({ stats, salesData, inventoryData, recentActivity }: any) {
    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            {/* Top Bar / Welcome */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kola Borasi Intelligence</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                        <p className="text-slate-500 font-medium text-sm">System operational • Real-time data sync active</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group invisible md:visible">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input
                            placeholder="Cari transaksi..."
                            className="bg-white border-2 border-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm font-medium focus:border-primary outline-none transition-all w-64 shadow-sm"
                        />
                    </div>
                    <button className="p-2.5 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm relative text-primary">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white" />
                    </button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat: any, i: number) => (
                    <div key={i} className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div className={stat.iconBg + " p-3 rounded-2xl group-hover:scale-110 transition-transform"}>
                                    {(() => {
                                        const Icon = IconMap[stat.iconName] || Package;
                                        return <Icon className={stat.iconColor + " h-6 w-6"} />;
                                    })()}
                                </div>
                                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${stat.trend === 'up' ? 'text-emerald-600 bg-emerald-100' : 'text-amber-600 bg-amber-100'}`}>
                                    {stat.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    {stat.change}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.name}</p>
                                <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h3>
                            </div>
                        </div>
                        <div className={`absolute -right-4 -bottom-4 h-24 w-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity ${stat.iconColor.replace('text-', 'bg-')}`} />
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sales Area Chart */}
                <div className="lg:col-span-2 bg-white border-2 border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Weekly Operations</h3>
                            <p className="text-slate-500 text-sm font-medium">Transaction volume by module</p>
                        </div>
                        <select className="bg-slate-50 border-2 border-slate-100 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 outline-none">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorPurch" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Area type="monotone" dataKey="purchases" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPurch)" dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Inventory Pie Chart */}
                <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col">
                    <div className="mb-6">
                        <h3 className="text-xl font-black text-slate-900">Inventory Distribution</h3>
                        <p className="text-slate-500 text-sm font-medium">By product category</p>
                    </div>
                    <div className="flex-1 h-[250px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={inventoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {inventoryData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Qty</span>
                            <span className="text-3xl font-black text-slate-900">
                                {inventoryData.reduce((a: number, b: any) => a + b.value, 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-3 mt-6">
                        {inventoryData.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-sm font-bold">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    {item.name}
                                </div>
                                <span className="text-slate-900">{item.value.toLocaleString()} items</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Recent Activity & Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity Table */}
                <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-slate-900">Latest Operations</h3>
                        <a href="/finance" className="text-xs font-black text-blue-600 border-b-2 border-blue-600/20 hover:border-blue-600 transition-all">View All</a>
                    </div>
                    <div className="space-y-4">
                        {recentActivity.map((act: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 border-2 border-transparent hover:border-slate-100 transition-all group">
                                <div className={`p-3 rounded-xl ${act.type === 'SALE' ? 'bg-blue-100 text-blue-600' :
                                    act.type === 'PURCHASE' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {act.type === 'SALE' ? <ShoppingBag className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-black text-slate-800 truncate">{act.description}</div>
                                    <div className="text-xs font-medium text-slate-400">{act.date} • {act.reference}</div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-sm font-black ${act.type === 'SALE' ? 'text-emerald-500' : 'text-slate-900'}`}>
                                        {act.type === 'SALE' ? '+' : ''}{formatCurrency(act.amount)}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Status: OK</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stock Alert / Summary */}
                <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold">Logistics Summary</h3>
                            <button className="bg-white/10 hover:bg-white/20 p-2 rounded-xl border border-white/5 transition-all text-white">
                                <TrendingUp className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl group-hover:bg-white/[0.08] transition-all">
                                <div className="text-primary font-bold text-xs uppercase tracking-widest mb-1">Active Shipments</div>
                                <div className="text-3xl font-black">24</div>
                                <div className="text-emerald-400 text-[10px] font-bold mt-2 flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" /> 12% increase
                                </div>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl group-hover:bg-white/[0.08] transition-all">
                                <div className="text-amber-500 font-bold text-xs uppercase tracking-widest mb-1">Low Stock Alerts</div>
                                <div className="text-3xl font-black text-amber-500">{inventoryData.filter((i: any) => i.value < 100).length}</div>
                                <div className="text-slate-400 text-[10px] font-bold mt-2">Requires review</div>
                            </div>
                        </div>

                        <div className="mt-8 p-6 bg-primary rounded-3xl flex items-center justify-between group-hover:scale-[1.02] transition-transform cursor-pointer shadow-2xl shadow-primary/40 text-white">
                            <div>
                                <h4 className="font-black text-lg leading-tight text-white">Generate Month-End<br />Business Report</h4>
                                <p className="text-white/70 text-xs font-bold mt-1">Ready for Feb 2026</p>
                            </div>
                            <div className="bg-white text-primary p-3 rounded-2xl">
                                <ArrowUpRight className="h-6 w-6 font-black" />
                            </div>
                        </div>
                    </div>

                    {/* Decorative bits */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-[100px]" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full -ml-16 -mb-16 blur-[60px]" />
                </div>
            </div>
        </div>
    );
}

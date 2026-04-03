"use client";

import { useState, useEffect, useCallback } from "react";
import { 
    Search, 
    Command, 
    Hash, 
    ShoppingBag, 
    ShoppingCart, 
    Activity, 
    Wallet, 
    ArrowRight,
    Zap,
    X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const NAVIGATION_ITEMS = [
    { id: "sj", title: "Surat Jalan / Penjualan", shortcut: "SJ", path: "/sales", icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-50" },
    { id: "lpb", title: "Penerimaan Barang / LPB", shortcut: "LPB", path: "/purchase", icon: ShoppingCart, color: "text-emerald-500", bg: "bg-emerald-50" },
    { id: "tr", title: "Tracking Item / Stok", shortcut: "TR", path: "/tracking", icon: Activity, color: "text-indigo-500", bg: "bg-indigo-50" },
    { id: "fi", title: "Finance / Journal", shortcut: "FI", path: "/finance", icon: Wallet, color: "text-amber-500", bg: "bg-amber-50" },
    { id: "dash", title: "Dashboard Utama", shortcut: "DB", path: "/", icon: Zap, color: "text-rose-500", bg: "bg-rose-50" },
];

export function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();

    const filteredItems = NAVIGATION_ITEMS.filter(item => 
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.shortcut.toLowerCase().includes(search.toLowerCase())
    );

    const closeModal = useCallback(() => {
        setIsOpen(false);
        setSearch("");
        setSelectedIndex(0);
    }, []);

    const navigateTo = useCallback((path: string) => {
        router.push(path);
        closeModal();
    }, [router, closeModal]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === "Escape") {
                closeModal();
            }
            if (isOpen) {
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev + 1) % filteredItems.length);
                }
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
                }
                if (e.key === "Enter") {
                    e.preventDefault();
                    if (filteredItems[selectedIndex]) {
                        navigateTo(filteredItems[selectedIndex].path);
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, filteredItems, selectedIndex, closeModal, navigateTo]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-start justify-center pt-[15vh] px-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={closeModal}
            />
            
            {/* Palette Panel */}
            <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-xl border border-white/20 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Search Header */}
                <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-slate-100/50 rounded-2xl text-slate-400">
                        <Command className="h-5 w-5" />
                    </div>
                    <input 
                        autoFocus
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Ketik shortcut (SJ, LPB, TR...) atau nama menu..."
                        className="flex-1 bg-transparent border-none text-xl font-black text-slate-900 outline-none placeholder:text-slate-300"
                    />
                    <div className="flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ESC to close</span>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto p-4 custom-scrollbar">
                    {filteredItems.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 py-2">Quick Navigation</p>
                            {filteredItems.map((item, index) => {
                                const Icon = item.icon;
                                const isActive = index === selectedIndex;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => navigateTo(item.path)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-4 rounded-[1.5rem] transition-all duration-200 group text-left",
                                            isActive ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" : "hover:bg-slate-50 text-slate-600"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "p-3 rounded-2xl transition-colors",
                                                isActive ? "bg-white/20 text-white" : cn(item.bg, item.color)
                                            )}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className={cn("text-sm font-black uppercase tracking-tight", isActive ? "text-white" : "text-slate-900")}>
                                                    {item.title}
                                                </h4>
                                                <p className={cn("text-[10px] font-bold uppercase tracking-widest", isActive ? "text-white/60" : "text-slate-400")}>
                                                    Navigate to {item.path}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "px-2 py-1 rounded-lg text-[10px] font-black border transition-all",
                                                isActive ? "bg-white/20 border-white/40 text-white" : "bg-slate-50 border-slate-200 text-slate-400"
                                            )}>
                                                {item.shortcut}
                                            </div>
                                            <ArrowRight className={cn("h-4 w-4 transition-transform", isActive ? "translate-x-1" : "opacity-0")} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-20 text-center">
                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200 opacity-50">
                                <Search className="h-6 w-6 text-slate-300" />
                            </div>
                            <p className="text-sm font-black text-slate-300 uppercase tracking-widest leading-loose">
                                Tidak ada menu yang cocok <br />
                                <span className="text-[10px] text-slate-200">Coba "SJ" atau "LPB"</span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Tips */}
                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black shadow-sm">⏎</kbd>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black shadow-sm">↓↑</kbd>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Navigate</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                        <Zap className="h-3 w-3 fill-current" />
                        Turbo Mode Active
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { Info, X, ChevronRight, Target, Activity, ListChecks } from "lucide-react";
import { ROLE_SOP, RoleType } from "@/lib/sop-data";
import { cn } from "@/lib/utils";

interface RoleGuidelineProps {
    role: string;
}

export function RoleGuideline({ role }: RoleGuidelineProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    // Use role as key for localStorage to remember dismissal per role
    const storageKey = `dismissed_sop_${role}`;

    useEffect(() => {
        const dismissed = localStorage.getItem(storageKey);
        if (dismissed === "true") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsVisible(false);
        }
    }, [storageKey]);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem(storageKey, "true");
    };

    const sop = (ROLE_SOP as any)[role] || (ROLE_SOP as any)["ADMIN"];

    if (!isVisible) return null;

    return (
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className={cn(
                "relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/40 backdrop-blur-xl shadow-2xl shadow-slate-200/50 transition-all duration-500",
                isExpanded ? "p-8 md:p-10" : "p-6 md:p-8"
            )}>
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-start md:items-center gap-5">
                        <div className="p-4 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl shadow-lg shadow-primary/20 text-white shrink-0 group transition-transform hover:scale-110">
                            <Info className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] bg-primary/10 px-2.5 py-1 rounded-full">Standard Operating Procedure</span>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{role} Profile</span>
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                                Panduan Tugas: <span className="text-primary">{sop.title}</span>
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                        >
                            {isExpanded ? "Tutup Detail" : "Lihat SOP Lengkap"}
                            <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="Jangan tampilkan lagi"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {isExpanded && (
                    <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="p-6 bg-white/60 rounded-3xl border border-white/60 shadow-inner group transition-all hover:bg-white hover:shadow-lg">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                    <Target className="h-4 w-4" />
                                </div>
                                <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest">Tujuan Utama</h3>
                            </div>
                            <p className="text-sm font-medium text-slate-600 leading-relaxed font-sans">{sop.goal}</p>
                        </div>

                        <div className="p-6 bg-white/60 rounded-3xl border border-white/60 shadow-inner group transition-all hover:bg-white hover:shadow-lg">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <ListChecks className="h-4 w-4" />
                                </div>
                                <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest">Tanggung Jawab</h3>
                            </div>
                            <ul className="space-y-2.5">
                                {sop.responsibilities.map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2.5 text-xs font-bold text-slate-600">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="p-6 bg-white/60 rounded-3xl border border-white/60 shadow-inner group transition-all hover:bg-white hover:shadow-lg">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                    <Activity className="h-4 w-4" />
                                </div>
                                <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest">Alur Kerja Harian</h3>
                            </div>
                            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                                <p className="text-xs font-black text-amber-700 leading-relaxed italic">{sop.workflow}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

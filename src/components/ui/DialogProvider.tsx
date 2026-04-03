"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { X, AlertTriangle, Info, HelpCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "info" | "warning" | "danger" | "success";
    defaultValue?: string;
    showSlider?: boolean;
    hasCountdown?: boolean;
}

interface DialogContextType {
    confirm: (options: DialogOptions) => Promise<boolean>;
    alert: (options: DialogOptions) => Promise<void>;
    prompt: (options: DialogOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function useDialog() {
    const context = useContext(DialogContext);
    if (!context) throw new Error("useDialog must be used within DialogProvider");
    return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
    const [activeDialog, setActiveDialog] = useState<{
        options: DialogOptions;
        type: "confirm" | "alert" | "prompt";
        resolve: (val: any) => void;
    } | null>(null);

    const [inputValue, setInputValue] = useState("");
    const [countdown, setCountdown] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (activeDialog?.options.hasCountdown && activeDialog.type === "confirm") {
            setCountdown(2);
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [activeDialog]);

    const confirm = (options: DialogOptions) => new Promise<boolean>(resolve => {
        setActiveDialog({ options, type: "confirm", resolve });
    });

    const alert = (options: DialogOptions) => new Promise<void>(resolve => {
        setActiveDialog({ options, type: "alert", resolve });
    });

    const prompt = (options: DialogOptions) => new Promise<string | null>(resolve => {
        setInputValue(options.defaultValue || "");
        setActiveDialog({ options, type: "prompt", resolve });
    });

    const handleClose = (value: any) => {
        if (activeDialog) {
            activeDialog.resolve(value);
            setActiveDialog(null);
            setCountdown(0);
        }
    };

    const getIcon = () => {
        const type = activeDialog?.options.type || "info";
        switch (type) {
            case "danger": return <AlertTriangle className="h-6 w-6 text-rose-500" />;
            case "warning": return <AlertTriangle className="h-6 w-6 text-orange-500" />;
            case "success": return <CheckCircle2 className="h-6 w-6 text-emerald-500" />;
            default: return <Info className="h-6 w-6 text-blue-500" />;
        }
    };

    return (
        <DialogContext.Provider value={{ confirm, alert, prompt }}>
            {children}

            {activeDialog && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <div className="flex items-start gap-5 mb-6">
                                <div className={cn(
                                    "p-4 rounded-2xl shrink-0 shadow-lg",
                                    activeDialog.options.type === "danger" ? "bg-rose-50 text-rose-500 shadow-rose-200/50" :
                                    activeDialog.options.type === "warning" ? "bg-orange-50 text-orange-500 shadow-orange-200/50" :
                                    activeDialog.options.type === "success" ? "bg-emerald-50 text-emerald-500 shadow-emerald-200/50" :
                                    "bg-blue-50 text-blue-500 shadow-blue-200/50"
                                )}>
                                    {getIcon()}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                                        {activeDialog.options.title || (
                                            activeDialog.type === "confirm" ? "Konfirmasi Tindakan" :
                                            activeDialog.type === "prompt" ? "Input Data" : "Informasi Sistem"
                                        )}
                                    </h3>
                                    <p className="text-slate-500 font-medium text-sm leading-relaxed">
                                        {activeDialog.options.message}
                                    </p>
                                </div>
                            </div>

                            {activeDialog.type === "prompt" && (
                                <div className="space-y-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                            className="w-full bg-white border border-slate-200 px-5 py-4 rounded-2xl text-lg font-black text-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                                            autoFocus
                                            placeholder="Ketik nilai..."
                                        />
                                        {activeDialog.options.showSlider && (
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-primary text-xl">%</span>
                                        )}
                                    </div>
                                    
                                    {activeDialog.options.showSlider && (
                                        <div className="px-2 pt-2">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={Number(inputValue) || 0}
                                                onChange={e => setInputValue(e.target.value)}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                            <div className="flex justify-between mt-3">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">0%</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">50%</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">100%</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3">
                                {activeDialog.type !== "alert" && (
                                    <button
                                        onClick={() => handleClose(activeDialog.type === "prompt" ? null : false)}
                                        className="flex-1 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all active:scale-95"
                                    >
                                        {activeDialog.options.cancelText || "Batal"}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleClose(activeDialog.type === "prompt" ? inputValue : true)}
                                    disabled={countdown > 0}
                                    className={cn(
                                        "flex-1 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2",
                                        activeDialog.options.type === "danger" ? "bg-rose-600 text-white shadow-rose-200 hover:bg-slate-900" :
                                        activeDialog.options.type === "success" ? "bg-emerald-600 text-white shadow-emerald-200 hover:bg-slate-900" :
                                        "bg-primary text-white shadow-primary/20 hover:bg-slate-900",
                                        countdown > 0 && "opacity-50 cursor-not-allowed transform-none scale-100"
                                    )}
                                >
                                    {activeDialog.options.confirmText || "Oke"}
                                    {countdown > 0 && (
                                        <span className="bg-white/20 h-5 w-5 rounded-full flex items-center justify-center text-[10px]">
                                            {countdown}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
}

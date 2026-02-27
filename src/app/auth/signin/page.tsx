"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import {
    LayoutDashboard,
    Lock,
    Mail,
    ArrowRight,
    ShieldCheck,
    Building2,
    Loader2
} from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Note: In this simulation, we use credentials provider
            // The user will need to configure providers in lib/auth.ts for real logic
            const result = await signIn("credentials", {
                email,
                password,
                redirect: true,
                callbackUrl: "/"
            });

            if (result?.error) {
                setError("Invalid email or password. Please try again.");
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-primary selection:text-white">
            <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
                {/* Brand Logo & Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 bg-primary rounded-2xl shadow-xl shadow-primary/20 mb-4 rotate-3 hover:rotate-0 transition-transform duration-300">
                        <Building2 className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kola Borasi Indonesia</h1>
                    <p className="text-slate-500 font-medium mt-1 uppercase tracking-[0.2em] text-[10px]">ERP Management System</p>
                </div>

                {/* Login Card */}
                <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />

                    <div className="relative z-10">
                        <div className="mb-8">
                            <h2 className="text-xl font-black text-slate-800">Welcome Back</h2>
                            <p className="text-slate-400 text-sm font-medium">Please enter your details to sign in.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@kolaborasi.id"
                                        className="w-full bg-slate-50 border-2 border-slate-100 px-12 py-3.5 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-semibold text-slate-700 placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                                    <Link href="#" className="text-[10px] font-bold text-primary hover:underline">Forgot Password?</Link>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border-2 border-slate-100 px-12 py-3.5 rounded-2xl outline-none focus:border-primary focus:bg-white transition-all font-semibold text-slate-700 placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                                    <div className="h-1.5 w-1.5 bg-red-600 rounded-full" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-xl shadow-primary/25 hover:bg-primary/95 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group disabled:opacity-70 disabled:active:scale-100"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                                ) : (
                                    <>
                                        <span className="text-white">Masuk</span>
                                        <ArrowRight className="h-5 w-5 text-white group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
                            <ShieldCheck className="h-4 w-4" />
                            Secure End-to-End Encryption
                        </div>
                    </div>
                </div>

                {/* Footer Attribution */}
                <div className="text-center mt-10">
                    <p className="text-slate-300 text-[10px] font-medium uppercase tracking-[0.3em]">
                        &copy; 2026 PT. Kola Borasi Indonesia
                    </p>
                </div>
            </div>
        </div>
    );
}

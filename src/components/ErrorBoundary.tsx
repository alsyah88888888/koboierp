"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-12 bg-white rounded-[2.5rem] border-2 border-rose-100 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">{this.props.fallbackTitle || "System Error Detected"}</h3>
            <p className="text-sm text-slate-500 mt-2">The application encountered a runtime error in this module.</p>
            <div className="mt-4 p-4 bg-slate-50 rounded-2xl text-left border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnostic Info</p>
                <p className="text-[11px] font-mono text-rose-600 break-all">{this.state.error?.message || "Unknown error"}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs mx-auto active:scale-95 transition-all shadow-lg shadow-slate-200"
          >
            <RefreshCcw className="h-4 w-4" />
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

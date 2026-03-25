import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kola Borasi ERP",
  description: "PT. Kola Borasi Indonesia - ERP Solution",
};

import { Providers } from "@/components/layout/providers";
import { TopHeader } from "@/components/layout/TopHeader";

import { cookies } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Force global dynamic rendering to bypass all build-time DB checks
  await cookies();
  
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <Providers>
          <div className="flex min-h-screen bg-slate-50/50">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <TopHeader />
              <main className="flex-1 p-2 sm:p-4 md:p-8 relative">
                <div className="max-w-[1600px] mx-auto">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}

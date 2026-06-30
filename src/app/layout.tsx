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
import { CommandPalette } from "@/components/CommandPalette";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";

import { cookies } from "next/headers";
import { IdleLogout } from "./components/IdleLogout";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Force global dynamic rendering to bypass all build-time DB checks
  await cookies();
  const session = await getServerSession(getAuthOptions());
  
  if (!session) {
    return (
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-slate-50 antialiased`} suppressHydrationWarning>
          <Providers session={session}>
            {children}
          </Providers>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased`} suppressHydrationWarning>
        <Providers session={session}>
          <IdleLogout />
          <div className="flex min-h-screen bg-slate-50/50">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <TopHeader />
              <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 relative">
                <div className="max-w-[1800px] mx-auto w-full">
                  {children}
                </div>
              </main>
              <CommandPalette />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}

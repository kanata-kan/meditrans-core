"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":              "Tableau de bord",
  "/dashboard/clients":      "Clients",
  "/dashboard/patients":     "Patients",
  "/dashboard/services":     "Services",
  "/dashboard/admin/pricing":"Tarification",
  "/dashboard/invoices":     "Factures",
  "/dashboard/payments":     "Paiements",
};

function resolveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(prefix + "/")) return title;
  }
  return "MediTrans";
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const title = resolveTitle(pathname);

  return (
    <div className="min-h-screen bg-surface-light">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-[var(--sidebar-width)] flex flex-col min-h-screen">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

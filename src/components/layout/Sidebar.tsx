"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserRound,
  Ambulance,
  Calculator,
  FileText,
  CreditCard,
  Settings,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Tableau de bord", href: "/dashboard",              icon: LayoutDashboard },
  { label: "Clients",         href: "/dashboard/clients",      icon: Users },
  { label: "Patients",        href: "/dashboard/patients",     icon: UserRound },
  { label: "Services",        href: "/dashboard/services",     icon: Ambulance },
  { label: "Tarification",    href: "/dashboard/admin/pricing",icon: Calculator },
  { label: "Factures",        href: "/dashboard/invoices",     icon: FileText },
  { label: "Paiements",       href: "/dashboard/payments",     icon: CreditCard },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 lg:hidden animate-fade-in"
          style={{ zIndex: "var(--z-overlay)" }}
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 flex flex-col bg-surface-dark text-white",
          "w-[var(--sidebar-width)] transition-transform duration-300",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ zIndex: "var(--z-sidebar)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-[var(--header-height)] px-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">🚑 MediTrans</span>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-primary text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <item.icon size={18} className="flex-shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <Link
            href="/dashboard/admin/pricing"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <Settings size={14} />
            Administration
          </Link>
          <p className="text-[11px] text-gray-600 mt-2">MediTrans Core · v0.1</p>
        </div>
      </aside>
    </>
  );
}

"use client";

import { Menu } from "lucide-react";

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  return (
    <header
      className="sticky top-0 flex items-center gap-4 bg-surface/80 backdrop-blur-sm border-b border-border px-6"
      style={{ height: "var(--header-height)", zIndex: "var(--z-header)" }}
    >
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-md text-text-secondary hover:bg-surface-muted transition-colors"
        aria-label="Ouvrir le menu"
      >
        <Menu size={20} />
      </button>
      <h1 className="text-lg text-text-primary truncate">{title}</h1>
    </header>
  );
}

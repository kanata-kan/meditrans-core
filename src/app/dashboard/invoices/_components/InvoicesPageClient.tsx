"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

/* ── Types ── */
interface InvoiceRow {
  id: number;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientName: string;
  totalTtc: number;
  linesCount: number;
  dueDate: string | null;
  createdAt: string;
}

interface Props {
  initialInvoices: InvoiceRow[];
}

/* ── Status filter tabs ── */
const STATUS_FILTERS: { label: string; value: InvoiceStatus | "all"; icon: React.ReactNode }[] = [
  { label: "Toutes",    value: "all",       icon: null },
  { label: "Impayées",  value: "unpaid",    icon: <AlertCircle size={14} /> },
  { label: "Partielles", value: "partial",  icon: <Clock size={14} /> },
  { label: "Payées",    value: "paid",      icon: <CheckCircle2 size={14} /> },
  { label: "Annulées",  value: "cancelled", icon: <XCircle size={14} /> },
];

const PAGE_SIZE = 10;

export function InvoicesPageClient({ initialInvoices }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [page, setPage] = useState(1);

  /* ── Filter + search ── */
  const filtered = useMemo(() => {
    let data = initialInvoices;
    if (statusFilter !== "all") {
      data = data.filter((inv) => inv.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.clientName.toLowerCase().includes(q),
      );
    }
    return data;
  }, [initialInvoices, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /* ── Columns ── */
  const columns: Column<InvoiceRow>[] = [
    {
      key: "invoiceNumber",
      header: "N° Facture",
      render: (row) => (
        <span className="font-mono text-sm font-semibold text-brand-primary">
          {row.invoiceNumber}
        </span>
      ),
    },
    {
      key: "client",
      header: "Client",
      render: (row) => (
        <span className="text-sm text-text-primary">{row.clientName}</span>
      ),
    },
    {
      key: "lines",
      header: "Lignes",
      render: (row) => (
        <span className="text-xs text-text-muted">{row.linesCount} service{row.linesCount !== 1 ? "s" : ""}</span>
      ),
      className: "text-center",
    },
    {
      key: "status",
      header: "Statut",
      render: (row) => (
        <Badge variant={statusToBadgeVariant(row.status, "invoice")}>
          {INVOICE_STATUS_LABELS[row.status]}
        </Badge>
      ),
      className: "text-center",
    },
    {
      key: "totalTtc",
      header: "Total TTC",
      render: (row) => (
        <span className="font-mono text-sm font-semibold text-text-primary">
          {formatCurrency(row.totalTtc)}
        </span>
      ),
      className: "text-right",
    },
    {
      key: "dueDate",
      header: "Échéance",
      render: (row) => (
        <span className="text-xs text-text-muted">
          {row.dueDate ? formatDate(row.dueDate) : "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Créée le",
      render: (row) => (
        <span className="text-xs text-text-muted">{formatDate(row.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Factures</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {initialInvoices.length} facture{initialInvoices.length !== 1 ? "s" : ""} au total
          </p>
        </div>
        <Link href="/dashboard/invoices/new">
          <Button size="sm">
            <Plus size={16} className="mr-1.5" />
            Nouvelle facture
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Rechercher par n° ou client..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          startIcon={<Search size={16} />}
          className="sm:max-w-xs"
        />
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                transition-colors border
                ${statusFilter === f.value
                  ? "bg-brand-primary text-white border-brand-primary"
                  : "bg-surface text-text-secondary border-border hover:bg-surface-muted"
                }
              `}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={paginated}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/dashboard/invoices/${row.id}`)}
        emptyMessage="Aucune facture trouvée"
        pagination={{
          page: safePage,
          totalPages,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}

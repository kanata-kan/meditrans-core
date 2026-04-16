"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";
import { SERVICE_STATUS_LABELS, URGENCY_LABELS, type ServiceStatus } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/utils";

/* ── Types ── */
interface ServiceRow {
  id: number;
  catalogCode: string;
  status: ServiceStatus;
  urgency: "normal" | "urgent";
  fromLocation: string;
  toLocation: string;
  distanceKm: number | string;
  scheduledAt: Date | string;
  patient: { id: number; fullName: string };
  client: { id: number; name: string };
  catalog: { nameFr: string };
  snapshots: { totalTtc: number | string }[];
}

interface Props {
  initialServices: ServiceRow[];
}

/* ── Status filter tabs ── */
const STATUS_FILTERS: { label: string; value: ServiceStatus | "all"; icon: React.ReactNode }[] = [
  { label: "Tous",       value: "all",         icon: null },
  { label: "En attente",  value: "pending",     icon: <Clock size={14} /> },
  { label: "En cours",    value: "in_progress", icon: <Loader2 size={14} /> },
  { label: "Complétés",   value: "completed",   icon: <CheckCircle2 size={14} /> },
  { label: "Annulés",     value: "cancelled",   icon: <XCircle size={14} /> },
];

const PAGE_SIZE = 10;

export function ServicesPageClient({ initialServices }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | "all">("all");
  const [page, setPage] = useState(1);

  /* ── Filter + search ── */
  const filtered = useMemo(() => {
    let data = initialServices;
    if (statusFilter !== "all") {
      data = data.filter((s) => s.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (s) =>
          s.patient.fullName.toLowerCase().includes(q) ||
          s.client.name.toLowerCase().includes(q) ||
          s.catalog.nameFr.toLowerCase().includes(q) ||
          s.fromLocation.toLowerCase().includes(q) ||
          s.toLocation.toLowerCase().includes(q),
      );
    }
    return data;
  }, [initialServices, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /* ── Columns ── */
  const columns: Column<ServiceRow>[] = [
    {
      key: "id",
      header: "#",
      render: (row) => (
        <span className="font-mono text-xs text-text-muted">#{row.id}</span>
      ),
      className: "w-16",
    },
    {
      key: "catalog",
      header: "Service",
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">{row.catalog.nameFr}</p>
          <p className="text-xs text-text-muted mt-0.5">
            {row.fromLocation} → {row.toLocation}
          </p>
        </div>
      ),
    },
    {
      key: "patient",
      header: "Patient",
      render: (row) => (
        <div>
          <p className="text-sm text-text-primary">{row.patient.fullName}</p>
          <p className="text-xs text-text-muted">{row.client.name}</p>
        </div>
      ),
    },
    {
      key: "urgency",
      header: "Urgence",
      render: (row) => (
        <Badge variant={row.urgency === "urgent" ? "danger" : "default"}>
          {URGENCY_LABELS[row.urgency]}
        </Badge>
      ),
      className: "text-center",
    },
    {
      key: "status",
      header: "Statut",
      render: (row) => (
        <Badge variant={statusToBadgeVariant(row.status, "service")}>
          {SERVICE_STATUS_LABELS[row.status]}
        </Badge>
      ),
      className: "text-center",
    },
    {
      key: "total",
      header: "Total TTC",
      render: (row) => {
        const snap = row.snapshots[0];
        return (
          <span className="font-mono text-sm font-semibold text-text-primary">
            {snap ? formatCurrency(snap.totalTtc) : "—"}
          </span>
        );
      },
      className: "text-right",
    },
    {
      key: "scheduledAt",
      header: "Planifié",
      render: (row) => (
        <span className="text-xs text-text-muted">{formatDateTime(row.scheduledAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Services</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {initialServices.length} service{initialServices.length !== 1 ? "s" : ""} au total
          </p>
        </div>
        <Link href="/dashboard/services/new">
          <Button size="sm">
            <Plus size={16} className="mr-1.5" />
            Nouveau service
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Rechercher un service..."
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
        onRowClick={(row) => router.push(`/dashboard/services/${row.id}`)}
        emptyMessage="Aucun service trouvé"
        pagination={{
          page: safePage,
          totalPages,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}

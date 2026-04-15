"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Users, Building2, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";
import { CLIENT_TYPE_LABELS, type ClientType } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

/* ── Types ── */
interface ClientRow {
  id: number;
  name: string;
  type: ClientType;
  phone: string;
  email: string | null;
  address: string;
  createdAt: Date;
  _count: { patients: number; services: number; invoices: number };
}

interface Props {
  initialClients: ClientRow[];
}

/* ── Filter tabs ── */
const TYPE_FILTERS: { label: string; value: ClientType | "all"; icon: React.ReactNode }[] = [
  { label: "Tous",        value: "all",        icon: null },
  { label: "Particuliers", value: "individual", icon: <Users size={14} /> },
  { label: "Entreprises",  value: "company",    icon: <Building2 size={14} /> },
  { label: "Assureurs",    value: "insurer",    icon: <Shield size={14} /> },
];

const TYPE_BADGE_VARIANT: Record<ClientType, "default" | "info" | "warning"> = {
  individual: "default",
  company: "info",
  insurer: "warning",
};

/* ── Pagination ── */
const PAGE_SIZE = 10;

export function ClientsPageClient({ initialClients }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ClientType | "all">("all");
  const [page, setPage] = useState(1);

  /* ── Filter + search ── */
  const filtered = useMemo(() => {
    let data = initialClients;
    if (typeFilter !== "all") {
      data = data.filter((c) => c.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)),
      );
    }
    return data;
  }, [initialClients, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /* ── Columns ── */
  const columns: Column<ClientRow>[] = [
    {
      key: "name",
      header: "Nom",
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">{row.name}</p>
          <p className="text-xs text-text-muted mt-0.5">{row.phone}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <Badge variant={TYPE_BADGE_VARIANT[row.type]}>
          {CLIENT_TYPE_LABELS[row.type]}
        </Badge>
      ),
    },
    {
      key: "patients",
      header: "Patients",
      render: (row) => (
        <span className="text-text-secondary">{row._count.patients}</span>
      ),
      className: "text-center",
    },
    {
      key: "services",
      header: "Services",
      render: (row) => (
        <span className="text-text-secondary">{row._count.services}</span>
      ),
      className: "text-center",
    },
    {
      key: "createdAt",
      header: "Créé le",
      render: (row) => (
        <span className="text-text-muted text-xs">{formatDate(row.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Clients</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {initialClients.length} client{initialClients.length !== 1 ? "s" : ""} au total
          </p>
        </div>
        <Link href="/dashboard/clients/new">
          <Button size="sm">
            <Plus size={16} className="mr-1.5" />
            Nouveau client
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Rechercher un client..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          startIcon={<Search size={16} />}
          className="sm:max-w-xs"
        />
        <div className="flex gap-1.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setTypeFilter(f.value); setPage(1); }}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                transition-colors border
                ${typeFilter === f.value
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
        onRowClick={(row) => router.push(`/dashboard/clients/${row.id}`)}
        emptyMessage="Aucun client trouvé"
        pagination={{
          page: safePage,
          totalPages,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}

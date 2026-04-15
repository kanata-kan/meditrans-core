"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";
import { CLIENT_TYPE_LABELS, type ClientType } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

/* ── Types ── */
interface PatientRow {
  id: number;
  fullName: string;
  phone: string;
  dateOfBirth: Date;
  address: string;
  clientId: number;
  createdAt: Date;
  client: { id: number; name: string; type: ClientType };
  _count: { services: number };
}

interface Props {
  initialPatients: PatientRow[];
}

const PAGE_SIZE = 10;

export function PatientsPageClient({ initialPatients }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return initialPatients;
    const q = search.toLowerCase();
    return initialPatients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.client.name.toLowerCase().includes(q),
    );
  }, [initialPatients, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const columns: Column<PatientRow>[] = [
    {
      key: "fullName",
      header: "Patient",
      render: (row) => (
        <div>
          <p className="font-medium text-text-primary">{row.fullName}</p>
          <p className="text-xs text-text-muted mt-0.5">{row.phone}</p>
        </div>
      ),
    },
    {
      key: "dateOfBirth",
      header: "Date de naissance",
      render: (row) => (
        <span className="text-text-secondary text-sm">{formatDate(row.dateOfBirth)}</span>
      ),
    },
    {
      key: "client",
      header: "Client rattaché",
      render: (row) => (
        <div>
          <p className="text-sm text-text-primary">{row.client.name}</p>
          <Badge variant="default" className="mt-0.5">
            {CLIENT_TYPE_LABELS[row.client.type]}
          </Badge>
        </div>
      ),
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
          <h1 className="text-xl font-bold text-text-primary">Patients</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {initialPatients.length} patient{initialPatients.length !== 1 ? "s" : ""} au total
          </p>
        </div>
        <Link href="/dashboard/patients/new">
          <Button size="sm">
            <Plus size={16} className="mr-1.5" />
            Nouveau patient
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Input
        placeholder="Rechercher un patient ou un client..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        startIcon={<Search size={16} />}
        className="max-w-sm"
      />

      {/* Table */}
      <Table
        columns={columns}
        data={paginated}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/dashboard/patients/${row.id}`)}
        emptyMessage="Aucun patient trouvé"
        pagination={{
          page: safePage,
          totalPages,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}

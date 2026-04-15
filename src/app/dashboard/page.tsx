import Link from "next/link";
import { Users, UserRound, Ambulance, FileText, CreditCard, ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { db } from "@/lib/db";

async function getStats() {
  const [clients, patients, services, invoices, payments] = await Promise.all([
    db.client.count(),
    db.patient.count(),
    db.service.count(),
    db.invoice.count(),
    db.payment.count(),
  ]);
  return { clients, patients, services, invoices, payments };
}

const STAT_CARDS = [
  { key: "clients",  label: "Clients",   icon: Users,      href: "/dashboard/clients",  color: "text-brand-primary" },
  { key: "patients", label: "Patients",  icon: UserRound,  href: "/dashboard/patients", color: "text-status-info" },
  { key: "services", label: "Services",  icon: Ambulance,  href: "/dashboard/services", color: "text-status-warning" },
  { key: "invoices", label: "Factures",  icon: FileText,   href: "/dashboard/invoices", color: "text-status-danger" },
  { key: "payments", label: "Paiements", icon: CreditCard, href: "/dashboard/payments", color: "text-status-success" },
] as const;

const QUICK_LINKS = [
  { label: "Nouveau client",  href: "/dashboard/clients/new" },
  { label: "Nouveau patient", href: "/dashboard/patients/new" },
];

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Tableau de bord</h1>
        <p className="text-sm text-text-muted mt-0.5">Vue d&apos;ensemble de MediTrans</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.key} href={card.href}>
              <Card className="hover:border-brand-primary/30 transition-colors">
                <CardBody className="text-center">
                  <Icon size={22} className={`mx-auto mb-2 ${card.color}`} />
                  <p className="text-2xl font-bold text-text-primary">
                    {stats[card.key as keyof typeof stats]}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">{card.label}</p>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3">Actions rapides</h2>
        <div className="flex flex-wrap gap-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-lg text-sm font-medium text-text-secondary hover:text-brand-primary hover:border-brand-primary/30 transition-colors"
            >
              {link.label}
              <ArrowRight size={14} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Search, Mail, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Badge, statusToBadgeVariant } from "@/components/ui/Badge";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { Table, type Column } from "@/components/ui/Table";
import { FormField } from "@/components/forms/FormField";
import {
  INVOICE_STATUS_LABELS,
  SERVICE_STATUS_LABELS,
} from "@/lib/constants";

/* ── Helpers ── */
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-2xl text-text-primary mb-1">{title}</h2>
      <div className="h-px bg-border mb-6" />
      {children}
    </section>
  );
}

function Preview({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      {label && <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">{label}</p>}
      <div className="p-5 bg-surface-light border border-border rounded-lg">{children}</div>
    </div>
  );
}

/* ── Sample data for Table ── */
interface SampleRow {
  id: number;
  name: string;
  type: string;
  status: string;
  amount: string;
}

const sampleData: SampleRow[] = [
  { id: 1, name: "Transport simple",   type: "transport",   status: "completed", amount: "165.00 MAD" },
  { id: 2, name: "ECG",                type: "acte",        status: "pending",   amount: "220.00 MAD" },
  { id: 3, name: "Infirmier 12h",      type: "disposition", status: "in_progress", amount: "550.00 MAD" },
  { id: 4, name: "Transport urgent",   type: "transport",   status: "cancelled", amount: "275.00 MAD" },
  { id: 5, name: "Suture",             type: "acte",        status: "completed", amount: "330.00 MAD" },
];

const sampleColumns: Column<SampleRow>[] = [
  { key: "id", header: "#", className: "w-12" },
  { key: "name", header: "Service", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "type", header: "Type", render: (r) => <Badge>{r.type}</Badge> },
  {
    key: "status",
    header: "Statut",
    render: (r) => (
      <Badge variant={statusToBadgeVariant(r.status, "service")}>
        {SERVICE_STATUS_LABELS[r.status as keyof typeof SERVICE_STATUS_LABELS] ?? r.status}
      </Badge>
    ),
  },
  { key: "amount", header: "Montant", className: "text-right font-mono" },
];

/* ── Navigation items ── */
const NAV = [
  { id: "tokens",    label: "Tokens" },
  { id: "button",    label: "Button" },
  { id: "input",     label: "Input" },
  { id: "textarea",  label: "Textarea" },
  { id: "select",    label: "Select" },
  { id: "badge",     label: "Badge" },
  { id: "card",      label: "Card" },
  { id: "modal",     label: "Modal" },
  { id: "table",     label: "Table" },
  { id: "formfield", label: "FormField" },
  { id: "spinner",   label: "Spinner" },
];

/* ══════════════════════════════════════════════════════ */
export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [tablePage, setTablePage] = useState(1);

  return (
    <div className="min-h-screen bg-surface-light">
      {/* ── Top header ── */}
      <header className="sticky top-0 z-30 bg-surface-dark text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">🎨 MediTrans Design System</h1>
            <p className="text-gray-400 text-xs mt-0.5">Composants, tokens, et guide visuel</p>
          </div>
          <a
            href="/dashboard"
            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors"
          >
            ← Dashboard
          </a>
        </div>
        {/* Section nav */}
        <div className="border-t border-white/10 overflow-x-auto">
          <div className="max-w-7xl mx-auto px-6 flex gap-1 py-2">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className="px-3 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors whitespace-nowrap"
              >
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-16">

        {/* ════════ TOKENS ════════ */}
        <Section id="tokens" title="Design Tokens">
          <p className="text-sm text-text-secondary mb-6">
            Tous les tokens sont définis dans <code className="text-xs bg-surface-muted px-1.5 py-0.5 rounded">tailwind.config.ts</code> et
            <code className="text-xs bg-surface-muted px-1.5 py-0.5 rounded ml-1">tokens.css</code>. Aucune valeur hardcodée.
          </p>

          <Preview label="Couleurs — Brand">
            <div className="flex gap-3 flex-wrap">
              <Swatch color="bg-brand-primary" label="primary" />
              <Swatch color="bg-brand-hover" label="hover" />
              <Swatch color="bg-brand-soft" label="soft" text="text-brand-primary" />
            </div>
          </Preview>

          <Preview label="Couleurs — Status">
            <div className="flex gap-3 flex-wrap">
              <Swatch color="bg-status-success" label="success" />
              <Swatch color="bg-status-warning" label="warning" />
              <Swatch color="bg-status-danger" label="danger" />
              <Swatch color="bg-status-info" label="info" />
            </div>
          </Preview>

          <Preview label="Couleurs — Surface & Text">
            <div className="flex gap-3 flex-wrap">
              <Swatch color="bg-surface-dark" label="dark" />
              <Swatch color="bg-surface border border-border" label="surface" text="text-text-primary" />
              <Swatch color="bg-surface-light border border-border" label="light" text="text-text-primary" />
              <Swatch color="bg-surface-muted border border-border" label="muted" text="text-text-primary" />
            </div>
          </Preview>

          <Preview label="Radius">
            <div className="flex gap-4 items-end">
              <div className="w-16 h-16 bg-brand-soft border border-brand-primary/20 rounded-sm flex items-center justify-center text-xs text-brand-primary font-mono">sm</div>
              <div className="w-16 h-16 bg-brand-soft border border-brand-primary/20 rounded-md flex items-center justify-center text-xs text-brand-primary font-mono">md</div>
              <div className="w-16 h-16 bg-brand-soft border border-brand-primary/20 rounded-lg flex items-center justify-center text-xs text-brand-primary font-mono">lg</div>
              <div className="w-16 h-16 bg-brand-soft border border-brand-primary/20 rounded-xl flex items-center justify-center text-xs text-brand-primary font-mono">xl</div>
            </div>
          </Preview>

          <Preview label="Shadows">
            <div className="flex gap-6 items-end flex-wrap">
              <div className="w-24 h-16 bg-surface rounded-md shadow-xs flex items-center justify-center text-xs text-text-muted">xs</div>
              <div className="w-24 h-16 bg-surface rounded-md shadow-sm flex items-center justify-center text-xs text-text-muted">sm</div>
              <div className="w-24 h-16 bg-surface rounded-md shadow-md flex items-center justify-center text-xs text-text-muted">md</div>
              <div className="w-24 h-16 bg-surface rounded-md shadow-lg flex items-center justify-center text-xs text-text-muted">lg</div>
            </div>
          </Preview>
        </Section>

        {/* ════════ BUTTON ════════ */}
        <Section id="button" title="Button">
          <Preview label="Variants">
            <div className="flex gap-3 flex-wrap items-center">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </Preview>
          <Preview label="Sizes">
            <div className="flex gap-3 items-center">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </Preview>
          <Preview label="States">
            <div className="flex gap-3 items-center">
              <Button loading>Chargement…</Button>
              <Button disabled>Désactivé</Button>
              <Button variant="danger" loading>Suppression…</Button>
            </div>
          </Preview>
          <PropsTable rows={[
            ["variant", "'primary' | 'secondary' | 'danger' | 'ghost'", "'primary'"],
            ["size", "'sm' | 'md' | 'lg'", "'md'"],
            ["loading", "boolean", "false"],
            ["disabled", "boolean", "false"],
          ]} />
        </Section>

        {/* ════════ INPUT ════════ */}
        <Section id="input" title="Input">
          <Preview label="Variantes">
            <div className="grid gap-4 max-w-sm">
              <Input label="Nom complet" placeholder="Mohammed Alami" />
              <Input label="Email" placeholder="email@example.com" startIcon={<Mail size={16} />} />
              <Input label="Recherche" placeholder="Rechercher…" endIcon={<Search size={16} />} />
              <Input label="Mot de passe" type="password" placeholder="••••••••" endIcon={<EyeOff size={16} />} />
              <Input label="Avec erreur" error="Ce champ est obligatoire" placeholder="…" />
              <Input label="Avec aide" helperText="Minimum 8 caractères" placeholder="…" />
              <Input label="Désactivé" disabled value="Non modifiable" />
            </div>
          </Preview>
          <PropsTable rows={[
            ["label", "string", "—"],
            ["error", "string", "—"],
            ["helperText", "string", "—"],
            ["startIcon", "ReactNode", "—"],
            ["endIcon", "ReactNode", "—"],
          ]} />
        </Section>

        {/* ════════ TEXTAREA ════════ */}
        <Section id="textarea" title="Textarea">
          <Preview label="Exemples">
            <div className="grid gap-4 max-w-sm">
              <Textarea label="Description" placeholder="Détails du service…" />
              <Textarea label="Notes" error="Minimum 10 caractères" placeholder="…" rows={3} />
            </div>
          </Preview>
        </Section>

        {/* ════════ SELECT ════════ */}
        <Section id="select" title="Select">
          <Preview label="Exemples">
            <div className="grid gap-4 max-w-sm">
              <Select
                label="Type de client"
                placeholder="Choisir un type…"
                options={[
                  { value: "individual", label: "Particulier" },
                  { value: "company", label: "Entreprise" },
                  { value: "insurer", label: "Assureur" },
                ]}
              />
              <Select
                label="Avec erreur"
                error="Sélection obligatoire"
                options={[{ value: "a", label: "Option A" }]}
              />
            </div>
          </Preview>
        </Section>

        {/* ════════ BADGE ════════ */}
        <Section id="badge" title="Badge / StatusPill">
          <Preview label="Variants">
            <div className="flex gap-2 flex-wrap">
              <Badge>Default</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="info">Info</Badge>
            </div>
          </Preview>
          <Preview label="Statuts MediTrans — Factures">
            <div className="flex gap-2 flex-wrap">
              {Object.entries(INVOICE_STATUS_LABELS).map(([status, label]) => (
                <Badge key={status} variant={statusToBadgeVariant(status, "invoice")}>{label}</Badge>
              ))}
            </div>
          </Preview>
          <Preview label="Statuts MediTrans — Services">
            <div className="flex gap-2 flex-wrap">
              {Object.entries(SERVICE_STATUS_LABELS).map(([status, label]) => (
                <Badge key={status} variant={statusToBadgeVariant(status, "service")}>{label}</Badge>
              ))}
            </div>
          </Preview>
        </Section>

        {/* ════════ CARD ════════ */}
        <Section id="card" title="Card">
          <Preview label="Avec Header, Body, Footer">
            <Card className="max-w-md">
              <CardHeader title="Détail service" description="Transport simple — #SRV-001" />
              <CardBody>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-text-muted">Client</span><p className="font-medium">Assurance Al Amane</p></div>
                  <div><span className="text-text-muted">Montant</span><p className="font-medium font-mono">165.00 MAD</p></div>
                  <div><span className="text-text-muted">Statut</span><p><Badge variant="success">Complété</Badge></p></div>
                  <div><span className="text-text-muted">Date</span><p className="font-medium">14/04/2026</p></div>
                </div>
              </CardBody>
              <CardFooter>
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="sm">Modifier</Button>
                  <Button size="sm">Voir facture</Button>
                </div>
              </CardFooter>
            </Card>
          </Preview>
        </Section>

        {/* ════════ MODAL ════════ */}
        <Section id="modal" title="Modal">
          <Preview label="Controlled modal">
            <Button onClick={() => setModalOpen(true)}>Ouvrir Modal</Button>
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Confirmer l'action">
              <p className="text-sm text-text-secondary mb-4">
                Êtes-vous sûr de vouloir annuler cette facture ? Cette action est irréversible.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Annuler</Button>
                <Button variant="danger" size="sm" onClick={() => setModalOpen(false)}>Confirmer</Button>
              </div>
            </Modal>
          </Preview>
          <PropsTable rows={[
            ["isOpen", "boolean", "—"],
            ["onClose", "() => void", "—"],
            ["title", "string", "—"],
            ["size", "'sm' | 'md' | 'lg'", "'md'"],
          ]} />
        </Section>

        {/* ════════ TABLE ════════ */}
        <Section id="table" title="Table">
          <Preview label="Avec données, pagination, et colonnes configurables">
            <Table
              columns={sampleColumns}
              data={sampleData.slice((tablePage - 1) * 3, tablePage * 3)}
              rowKey={(r) => r.id}
              pagination={{
                page: tablePage,
                totalPages: 2,
                onPageChange: setTablePage,
              }}
            />
          </Preview>
          <Preview label="État de chargement">
            <Table columns={sampleColumns} data={[]} rowKey={(r: SampleRow) => r.id} loading />
          </Preview>
          <Preview label="État vide">
            <Table columns={sampleColumns} data={[]} rowKey={(r: SampleRow) => r.id} emptyMessage="Aucun service trouvé" />
          </Preview>
        </Section>

        {/* ════════ FORMFIELD ════════ */}
        <Section id="formfield" title="FormField">
          <Preview label="Composition label + input + error">
            <div className="grid gap-4 max-w-sm">
              <FormField label="Nom du client" required error="Ce champ est obligatoire">
                <input
                  className="w-full h-9 px-3 text-sm bg-surface border border-status-danger rounded-md text-text-primary focus:outline-none"
                  placeholder="…"
                />
              </FormField>
              <FormField label="Notes" helperText="Optionnel — visible uniquement par l'admin">
                <textarea
                  className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-md text-text-primary focus:outline-none"
                  rows={3}
                  placeholder="…"
                />
              </FormField>
            </div>
          </Preview>
        </Section>

        {/* ════════ SPINNER ════════ */}
        <Section id="spinner" title="Spinner">
          <Preview label="Tailles">
            <div className="flex gap-6 items-center">
              <div className="flex items-center gap-2"><Spinner size="sm" /><span className="text-xs text-text-muted">sm</span></div>
              <div className="flex items-center gap-2"><Spinner size="md" /><span className="text-xs text-text-muted">md</span></div>
              <div className="flex items-center gap-2 text-brand-primary"><Spinner size="md" /><span className="text-xs">Couleur héritée</span></div>
            </div>
          </Preview>
        </Section>

      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-text-muted">
        MediTrans Design System · v0.1 · {NAV.length} composants documentés
      </footer>
    </div>
  );
}

/* ── Sub-components ── */

function Swatch({ color, label, text = "text-white" }: { color: string; label: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-14 h-14 rounded-lg ${color} ${text} flex items-center justify-center text-[10px] font-mono`}>
        Aa
      </div>
      <span className="text-[11px] text-text-muted font-mono">{label}</span>
    </div>
  );
}

function PropsTable({ rows }: { rows: [string, string, string][] }) {
  return (
    <div className="overflow-x-auto border border-border rounded-lg mt-2 mb-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-light border-b border-border">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase">Prop</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase">Type</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase">Default</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(([prop, type, def]) => (
            <tr key={prop}>
              <td className="px-4 py-2 font-mono text-xs text-brand-primary">{prop}</td>
              <td className="px-4 py-2 font-mono text-xs text-text-secondary">{type}</td>
              <td className="px-4 py-2 font-mono text-xs text-text-muted">{def}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

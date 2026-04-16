"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  createInvoiceAction,
  loadUninvoicedServicesAction,
} from "@/modules/invoices/invoice.actions";

/* ── Types ── */
interface ClientOption {
  id: number;
  name: string;
  type: string;
}

interface ServiceOption {
  id: number;
  catalogName: string;
  patientName: string;
  scheduledAt: string;
  totalTtc: number;
}

interface Props {
  clients: ClientOption[];
  preselectedClientId?: number;
}

export function InvoiceForm({ clients, preselectedClientId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Form state ── */
  const [clientId, setClientId] = useState<string>(preselectedClientId?.toString() || "");
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);

  /* ── Load uninvoiced services for selected client ── */
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setServices([]);
      setSelectedServiceIds([]);
      return;
    }
    setServicesLoading(true);
    setSelectedServiceIds([]);
    loadUninvoicedServicesAction(Number(clientId)).then((res) => {
      if (res.success && res.data) {
        setServices(res.data);
      } else {
        setServices([]);
      }
      setServicesLoading(false);
    });
  }, [clientId]);

  /* ── Toggle service selection ── */
  const toggleService = useCallback((id: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedServiceIds(services.map((s) => s.id));
  }, [services]);

  /* ── Total preview ── */
  const selectedTotal = useMemo(() => {
    return services
      .filter((s) => selectedServiceIds.includes(s.id))
      .reduce((sum, s) => sum + s.totalTtc, 0);
  }, [services, selectedServiceIds]);

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServiceIds.length === 0) {
      setError("Veuillez sélectionner au moins un service.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      clientId: Number(clientId),
      serviceIds: selectedServiceIds,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
    };

    const result = await createInvoiceAction(payload);

    if (result.success && "data" in result && result.data) {
      router.push(`/dashboard/invoices/${result.data.id}`);
    } else {
      setError(
        typeof result.error === "string"
          ? result.error
          : "Erreur lors de la création de la facture.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ══ FORM ══ */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-text-primary">Nouvelle facture</h2>
          </CardHeader>
          <CardBody>
            {error && (
              <div className="mb-4 text-sm text-status-danger bg-status-danger-soft px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Client */}
              <Select
                label="Client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                options={clients.map((c) => ({ value: String(c.id), label: c.name }))}
                placeholder="Sélectionner un client"
                required
              />

              {/* Services selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text-primary">
                    Services à facturer
                  </label>
                  {services.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-xs text-brand-primary hover:underline"
                    >
                      Tout sélectionner ({services.length})
                    </button>
                  )}
                </div>

                {!clientId ? (
                  <p className="text-sm text-text-muted py-4 text-center border border-border rounded-lg">
                    Choisissez un client pour voir les services disponibles
                  </p>
                ) : servicesLoading ? (
                  <div className="flex items-center justify-center py-4 border border-border rounded-lg">
                    <Loader2 size={16} className="animate-spin mr-2 text-text-muted" />
                    <span className="text-sm text-text-muted">Chargement des services...</span>
                  </div>
                ) : services.length === 0 ? (
                  <p className="text-sm text-text-muted py-4 text-center border border-border rounded-lg">
                    Aucun service non facturé pour ce client
                  </p>
                ) : (
                  <div className="border border-border rounded-lg divide-y divide-border max-h-80 overflow-y-auto">
                    {services.map((svc) => {
                      const selected = selectedServiceIds.includes(svc.id);
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => toggleService(svc.id)}
                          className={`
                            w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                            ${selected ? "bg-brand-primary/5" : "hover:bg-surface-light"}
                          `}
                        >
                          <span
                            className={`
                              w-5 h-5 rounded border flex items-center justify-center shrink-0
                              ${selected
                                ? "bg-brand-primary border-brand-primary text-white"
                                : "border-border"
                              }
                            `}
                          >
                            {selected && <Check size={12} />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {svc.catalogName}
                            </p>
                            <p className="text-xs text-text-muted">
                              {svc.patientName} — {formatDate(svc.scheduledAt)}
                            </p>
                          </div>
                          <span className="font-mono text-sm font-semibold text-text-primary shrink-0">
                            {formatCurrency(svc.totalTtc)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Due date */}
              <Input
                label="Date d'échéance (optionnel)"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />

              {/* Notes */}
              <Textarea
                label="Notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes optionnelles..."
              />

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button type="submit" loading={loading} disabled={selectedServiceIds.length === 0}>
                  Créer la facture
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>

      {/* ══ TOTAL PREVIEW ══ */}
      <div className="lg:col-span-1">
        <Card className="sticky top-6 border-brand-primary/20">
          <CardHeader>
            <h3 className="text-sm font-semibold text-text-primary">Résumé</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Services sélectionnés</span>
              <span className="font-semibold text-text-primary">{selectedServiceIds.length}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-text-primary">Total TTC</span>
              <span className="text-lg font-bold font-mono text-brand-primary">
                {formatCurrency(selectedTotal)}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

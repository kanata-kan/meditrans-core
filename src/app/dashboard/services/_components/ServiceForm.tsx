"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { URGENCY_LABELS, STAFF_TYPE_LABELS, type StaffType } from "@/lib/constants";
import { isNightTime } from "@/modules/pricing/pricing.utils";
import {
  createServiceAction,
  loadPatientsByClientAction,
} from "@/modules/services/service.actions";
import { PricingPreview } from "./PricingPreview";

/* ── Form data types (passed from server) ── */
interface ClientOption {
  id: number;
  name: string;
  type: string;
}

interface CatalogOption {
  code: string;
  nameFr: string;
  category: string;
  requiresDistance: boolean;
  requiresStaffType: boolean;
}

interface ModifierOption {
  code: string;
  nameFr: string;
  type: string;
  value: number;
}

interface PatientOption {
  id: number;
  fullName: string;
  phone: string;
}

interface NightConfig {
  NIGHT_START_HOUR: number;
  NIGHT_END_HOUR: number;
}

interface Props {
  clients: ClientOption[];
  catalogs: CatalogOption[];
  modifiers: ModifierOption[];
  nightConfig: NightConfig;
  preselectedClientId?: number;
}

const URGENCY_OPTIONS = (Object.entries(URGENCY_LABELS) as [string, string][]).map(
  ([value, label]) => ({ value, label }),
);

const STAFF_OPTIONS = (Object.entries(STAFF_TYPE_LABELS) as [StaffType, string][]).map(
  ([value, label]) => ({ value, label }),
);

export function ServiceForm({ clients, catalogs, modifiers, nightConfig, preselectedClientId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  /* ── Form state ── */
  const [clientId, setClientId] = useState<string>(preselectedClientId?.toString() || "");
  const [patientId, setPatientId] = useState<string>("");
  const [catalogCode, setCatalogCode] = useState<string>("");
  const [urgency, setUrgency] = useState<string>("normal");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [distanceKm, setDistanceKm] = useState<string>("0");
  const [staffType, setStaffType] = useState<string>("");
  const [durationHours, setDurationHours] = useState<string>("");
  const [scheduledAtLocal, setScheduledAtLocal] = useState<string>(getDefaultScheduleLocal());
  const [notes, setNotes] = useState("");
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);

  /* ── Night time auto-detection ── */
  const isNight = useMemo(() => {
    if (!scheduledAtLocal) return false;
    return isNightTime(new Date(scheduledAtLocal), nightConfig);
  }, [scheduledAtLocal, nightConfig]);

  useEffect(() => {
    setSelectedModifiers((prev) => {
      const has = prev.includes("NIGHT_SURCHARGE");
      if (isNight && !has) return [...prev, "NIGHT_SURCHARGE"];
      if (!isNight && has) return prev.filter((c) => c !== "NIGHT_SURCHARGE");
      return prev;
    });
  }, [isNight]);

  /* ── Patient loading ── */
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setPatients([]);
      setPatientId("");
      return;
    }
    setPatientsLoading(true);
    loadPatientsByClientAction(Number(clientId)).then((res) => {
      if (res.success) {
        setPatients(res.data);
        setPatientId("");
      }
      setPatientsLoading(false);
    });
  }, [clientId]);

  /* ── Selected catalog entry ── */
  const selectedCatalog = useMemo(
    () => catalogs.find((c) => c.code === catalogCode),
    [catalogs, catalogCode],
  );

  /* ── Catalog options grouped by category ── */
  const catalogOptions = useMemo(
    () => catalogs.map((c) => ({ value: c.code, label: `${c.nameFr} (${c.category})` })),
    [catalogs],
  );

  /* ── Stable ISO string for scheduledAt ── */
  const scheduledAtISO = useMemo(() => {
    if (!scheduledAtLocal) return "";
    try {
      return new Date(scheduledAtLocal).toISOString();
    } catch {
      return "";
    }
  }, [scheduledAtLocal]);

  /* ── Pricing preview data ── */
  const pricingData = useMemo(() => {
    if (!catalogCode || !scheduledAtISO) return null;
    return {
      catalogCode,
      urgency: urgency as "normal" | "urgent",
      distanceKm: Number(distanceKm) || 0,
      staffType: staffType || undefined,
      durationHours: durationHours ? Number(durationHours) : undefined,
      selectedModifiers,
      scheduledAt: scheduledAtISO,
    };
  }, [catalogCode, urgency, distanceKm, staffType, durationHours, selectedModifiers, scheduledAtISO]);

  /* ── Toggle modifier ── */
  const toggleModifier = useCallback((code: string) => {
    setSelectedModifiers((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }, []);

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const payload = {
      clientId: Number(clientId),
      patientId: Number(patientId),
      catalogCode,
      urgency,
      fromLocation,
      toLocation,
      distanceKm: Number(distanceKm) || 0,
      staffType: staffType || undefined,
      durationHours: durationHours ? Number(durationHours) : undefined,
      scheduledAt: scheduledAtISO,
      notes: notes || undefined,
      selectedModifiers,
    };

    const result = await createServiceAction(payload);

    if (result.success && "data" in result) {
      router.push(`/dashboard/services/${result.data.id}`);
    } else {
      if (typeof result.error === "string") {
        setError(result.error);
      } else if (result.error && "fieldErrors" in result.error) {
        setFieldErrors(result.error.fieldErrors as Record<string, string[]>);
      }
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ══ FORM ══ */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-text-primary">Nouveau service</h2>
          </CardHeader>
          <CardBody>
            {error && (
              <div className="mb-4 text-sm text-status-danger bg-status-danger-soft px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ── Client & Patient ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  options={clients.map((c) => ({ value: String(c.id), label: c.name }))}
                  placeholder="Sélectionner un client"
                  error={fieldErrors.clientId?.[0]}
                  required
                />
                <Select
                  label="Patient"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  options={patients.map((p) => ({ value: String(p.id), label: `${p.fullName} — ${p.phone}` }))}
                  placeholder={patientsLoading ? "Chargement..." : clientId ? "Sélectionner un patient" : "Choisir un client d'abord"}
                  disabled={!clientId || patientsLoading}
                  error={fieldErrors.patientId?.[0]}
                  required
                />
              </div>

              {/* ── Catalog & Urgency ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Type de service"
                  value={catalogCode}
                  onChange={(e) => setCatalogCode(e.target.value)}
                  options={catalogOptions}
                  placeholder="Sélectionner un service"
                  error={fieldErrors.catalogCode?.[0]}
                  required
                />
                <Select
                  label="Urgence"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  options={URGENCY_OPTIONS}
                  error={fieldErrors.urgency?.[0]}
                  required
                />
              </div>

              {/* ── Locations ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Lieu de départ"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  placeholder="Ex: CHU Ibn Rochd"
                  error={fieldErrors.fromLocation?.[0]}
                  required
                />
                <Input
                  label="Lieu d'arrivée"
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  placeholder="Ex: Clinique Ghandi"
                  error={fieldErrors.toLocation?.[0]}
                  required
                />
              </div>

              {/* ── Distance (conditional) ── */}
              {selectedCatalog?.requiresDistance && (
                <Input
                  label="Distance (km)"
                  type="number"
                  min="0"
                  step="0.1"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  error={fieldErrors.distanceKm?.[0]}
                />
              )}

              {/* ── Staff type & Duration (conditional) ── */}
              {selectedCatalog?.requiresStaffType && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Type de personnel"
                    value={staffType}
                    onChange={(e) => setStaffType(e.target.value)}
                    options={STAFF_OPTIONS}
                    placeholder="Sélectionner"
                    error={fieldErrors.staffType?.[0]}
                  />
                  <Input
                    label="Durée (heures)"
                    type="number"
                    min="1"
                    step="1"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    error={fieldErrors.durationHours?.[0]}
                  />
                </div>
              )}

              {/* ── Schedule + Night indicator ── */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-sm font-medium text-text-primary">
                    Date & heure planifiée
                  </label>
                  {scheduledAtLocal && (
                    <Badge variant={isNight ? "warning" : "info"}>
                      {isNight ? <Moon size={12} className="mr-1" /> : <Sun size={12} className="mr-1" />}
                      {isNight
                        ? `Nuit (${nightConfig.NIGHT_START_HOUR}h–${nightConfig.NIGHT_END_HOUR}h)`
                        : "Jour"}
                    </Badge>
                  )}
                </div>
                <Input
                  type="datetime-local"
                  value={scheduledAtLocal}
                  onChange={(e) => setScheduledAtLocal(e.target.value)}
                  error={fieldErrors.scheduledAt?.[0]}
                  required
                />
              </div>

              {/* ── Modifiers ── */}
              {modifiers.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-text-primary block mb-2">
                    Modificateurs de prix
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {modifiers.map((m) => {
                      const active = selectedModifiers.includes(m.code);
                      const isAutoNight = m.code === "NIGHT_SURCHARGE" && isNight;
                      return (
                        <button
                          key={m.code}
                          type="button"
                          onClick={() => toggleModifier(m.code)}
                          className={`
                            flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                            transition-colors border
                            ${active
                              ? "bg-brand-primary/10 text-brand-primary border-brand-primary/30"
                              : "bg-surface text-text-secondary border-border hover:bg-surface-muted"
                            }
                          `}
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${active ? "bg-brand-primary border-brand-primary text-white" : "border-border"}`}>
                            {active ? "✓" : ""}
                          </span>
                          {m.nameFr}
                          <span className="font-mono text-text-muted">
                            ({m.type === "flat_add" ? `+${m.value}` : `×${m.value}`})
                          </span>
                          {isAutoNight && (
                            <span className="text-[10px] text-status-warning ml-1">(auto)</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Notes ── */}
              <Textarea
                label="Notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes optionnelles sur le service..."
                error={fieldErrors.notes?.[0]}
              />

              {/* ── Actions ── */}
              <div className="flex gap-2 pt-2">
                <Button type="submit" loading={loading}>
                  Créer le service
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

      {/* ══ PRICING PREVIEW ══ */}
      <div className="lg:col-span-1">
        <PricingPreview formData={pricingData} />
      </div>
    </div>
  );
}

/* ── Helper: default schedule = now + 1h, formatted for datetime-local ── */
function getDefaultScheduleLocal(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

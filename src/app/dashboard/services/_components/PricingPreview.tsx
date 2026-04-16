"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { previewPriceAction } from "@/modules/services/service.actions";
import { formatCurrency } from "@/lib/utils";
import type { PricingResult } from "@/modules/pricing/pricing.types";

export interface PreviewFormData {
  catalogCode: string;
  urgency: "normal" | "urgent";
  distanceKm: number;
  staffType?: string;
  durationHours?: number;
  selectedModifiers: string[];
  scheduledAt: string;
}

interface PricingPreviewProps {
  formData: PreviewFormData | null;
}

export function PricingPreview({ formData }: PricingPreviewProps) {
  const [result, setResult] = useState<PricingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);

  const formDataKey = useMemo(
    () => (formData ? JSON.stringify(formData) : ""),
    [formData],
  );

  useEffect(() => {
    if (!formDataKey) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    const currentRequest = ++requestRef.current;
    setLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const payload = JSON.parse(formDataKey);
        const res = await previewPriceAction(payload);

        if (currentRequest !== requestRef.current) return;

        if (res.success && res.data) {
          setResult(res.data);
          setError(null);
        } else {
          setResult(null);
          setError(res.error || "Erreur de calcul");
        }
      } catch {
        if (currentRequest !== requestRef.current) return;
        setError("Erreur réseau");
      } finally {
        if (currentRequest === requestRef.current) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
    };
  }, [formDataKey]);

  return (
    <Card className="sticky top-6 border-brand-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">💰 Aperçu du prix</h3>
          {loading && <Spinner size="sm" />}
        </div>
      </CardHeader>
      <CardBody>
        {!formData || !formData.catalogCode ? (
          <p className="text-sm text-text-muted text-center py-4">
            Sélectionnez un type de service pour voir le prix estimé
          </p>
        ) : error && !result ? (
          <div className="text-sm text-status-danger bg-status-danger-soft px-3 py-2 rounded-md">
            {error}
          </div>
        ) : result ? (
          <div className={loading ? "opacity-60 transition-opacity" : ""}>
            <div className="space-y-3">
              {/* Breakdown lines */}
              {result.breakdown.map((line, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{line.label}</span>
                  <span className="font-mono text-text-primary">{formatCurrency(line.amount)}</span>
                </div>
              ))}

              {/* Separator */}
              <div className="border-t border-border my-2" />

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-text-primary">Total TTC</span>
                <span className="text-lg font-bold font-mono text-brand-primary">
                  {formatCurrency(result.totalTtc)}
                </span>
              </div>

              {/* Override badge */}
              {result.isOverridden && (
                <div className="text-xs text-status-warning bg-status-warning-soft px-2 py-1 rounded-md mt-1">
                  ⚠ Tarif manuel appliqué (original: {formatCurrency(result.overrideOriginalTotal ?? 0)})
                </div>
              )}

              {/* Details */}
              <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                <DetailRow label="Prix de base" value={formatCurrency(result.basePrice)} />
                {result.distanceFee > 0 && (
                  <DetailRow label="Frais distance" value={`+${formatCurrency(result.distanceFee)}`} />
                )}
                {result.modifiersApplied.length > 0 && result.modifiersApplied.map((m) => (
                  <DetailRow
                    key={m.code}
                    label={m.nameFr}
                    value={`${m.amountImpact >= 0 ? "+" : ""}${formatCurrency(m.amountImpact)}`}
                  />
                ))}
                <DetailRow label={`TVA (${(result.tvaRate * 100).toFixed(0)}%)`} value={formatCurrency(result.tvaAmount)} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <Spinner size="sm" />
            <span className="ml-2 text-sm text-text-muted">Calcul en cours...</span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-text-muted">{label}</span>
      <span className="font-mono text-text-secondary">{value}</span>
    </div>
  );
}

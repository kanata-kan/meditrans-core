"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { updateServiceStatusAction } from "@/modules/services/service.actions";
import type { ServiceStatus } from "@/lib/constants";

interface Props {
  serviceId: number;
  currentStatus: ServiceStatus;
}

const TRANSITIONS: Record<ServiceStatus, { label: string; next: ServiceStatus; variant: "primary" | "secondary" | "danger" }[]> = {
  pending: [
    { label: "Démarrer", next: "in_progress", variant: "primary" },
    { label: "Annuler", next: "cancelled", variant: "danger" },
  ],
  in_progress: [
    { label: "Terminer", next: "completed", variant: "primary" },
    { label: "Annuler", next: "cancelled", variant: "danger" },
  ],
  completed: [],
  cancelled: [],
};

export function ServiceStatusButton({ serviceId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ label: string; next: ServiceStatus } | null>(null);

  const actions = TRANSITIONS[currentStatus] || [];
  if (actions.length === 0) return null;

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setLoading(true);
    const result = await updateServiceStatusAction(serviceId, { status: confirmAction.next });
    if (result.success) {
      setConfirmAction(null);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <>
      <div className="flex gap-2">
        {actions.map((action) => (
          <Button
            key={action.next}
            variant={action.variant}
            size="sm"
            onClick={() => setConfirmAction(action)}
          >
            {action.label}
          </Button>
        ))}
      </div>

      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title="Confirmer le changement"
        size="sm"
      >
        <p className="text-sm text-text-secondary mb-4">
          Voulez-vous vraiment changer le statut de ce service ?
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setConfirmAction(null)} disabled={loading}>
            Non
          </Button>
          <Button size="sm" loading={loading} onClick={handleConfirm}>
            Oui, {confirmAction?.label.toLowerCase()}
          </Button>
        </div>
      </Modal>
    </>
  );
}

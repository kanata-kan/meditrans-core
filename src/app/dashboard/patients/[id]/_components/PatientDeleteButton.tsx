"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { deletePatientAction } from "@/modules/patients/patient.actions";

interface Props {
  patientId: number;
  patientName: string;
}

export function PatientDeleteButton({ patientId, patientName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    const result = await deletePatientAction(patientId);
    if (result.success) {
      router.push("/dashboard/patients");
    } else {
      setError(typeof result.error === "string" ? result.error : "Erreur inattendue.");
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Trash2 size={14} className="mr-1" />
        Supprimer
      </Button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Confirmer la suppression" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Voulez-vous vraiment supprimer le patient <strong className="text-text-primary">{patientName}</strong> ?
            Cette action est irréversible.
          </p>
          {error && (
            <p className="text-sm text-status-danger bg-status-danger-soft px-3 py-2 rounded-md">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete} loading={loading}>
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

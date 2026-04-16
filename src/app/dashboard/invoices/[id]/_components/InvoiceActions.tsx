"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cancelInvoiceAction } from "@/modules/invoices/invoice.actions";

interface Props {
  invoiceId: number;
  status: string;
  totalPaid: number;
}

export function InvoiceActions({ invoiceId, status, totalPaid }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const canCancel = status !== "cancelled" && totalPaid === 0;

  if (!canCancel) return null;

  const handleCancel = async () => {
    if (!confirm("Êtes-vous sûr de vouloir annuler cette facture ?")) return;

    setLoading(true);
    const result = await cancelInvoiceAction(invoiceId);
    if (result.success) {
      router.refresh();
    } else {
      alert(typeof result.error === "string" ? result.error : "Erreur lors de l'annulation.");
      setLoading(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCancel} disabled={loading}>
      <XCircle size={14} className="mr-1" />
      {loading ? "Annulation..." : "Annuler"}
    </Button>
  );
}

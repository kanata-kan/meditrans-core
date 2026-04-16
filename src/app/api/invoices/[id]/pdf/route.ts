import { NextRequest, NextResponse } from "next/server";
import { getInvoicePdfDataAction } from "@/modules/invoices/invoice.actions";
import { generateInvoicePdf } from "@/modules/invoices/pdf/generateInvoicePdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const result = await getInvoicePdfDataAction(id);

  if (!result.success || !result.data) {
    return NextResponse.json(
      { error: result.error || "Facture introuvable" },
      { status: 404 },
    );
  }

  const buffer = await generateInvoicePdf(result.data);
  const filename = `${result.data.invoiceNumber}.pdf`;
  const uint8 = new Uint8Array(buffer);

  return new NextResponse(uint8, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "no-store",
    },
  });
}

import ReactPDF from "@react-pdf/renderer";
import type { InvoicePdfConfig, InvoicePdfData } from "./invoicePdf.types";
import { mergeConfig } from "./invoicePdf.config";
import { InvoiceDocument } from "./InvoiceDocument";

/**
 * Generate a PDF buffer for the given invoice data.
 *
 * Usage:
 *   const buffer = await generateInvoicePdf(data);
 *   const buffer = await generateInvoicePdf(data, { currency: "EUR" });
 *
 * Compatible with Next.js API routes and Vercel serverless.
 */
export async function generateInvoicePdf(
  data: InvoicePdfData,
  configOverrides?: Partial<InvoicePdfConfig>,
): Promise<Buffer> {
  const config = mergeConfig(configOverrides);

  const stream = await ReactPDF.renderToStream(
    <InvoiceDocument data={data} config={config} />,
  );

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

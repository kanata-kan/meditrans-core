import { Document } from "@react-pdf/renderer";
import type { InvoicePdfConfig, InvoicePdfData } from "./invoicePdf.types";
import { InvoiceTemplate } from "./InvoiceTemplate";

interface Props {
  data: InvoicePdfData;
  config: InvoicePdfConfig;
}

export function InvoiceDocument({ data, config }: Props) {
  return (
    <Document
      title={`${config.labels.invoiceTitle} ${data.invoiceNumber}`}
      author={config.companyName}
      creator={config.companyName}
    >
      <InvoiceTemplate data={data} config={config} />
    </Document>
  );
}

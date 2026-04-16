import { Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { InvoicePdfConfig, InvoicePdfData } from "./invoicePdf.types";
import { InvoiceHeader } from "./InvoiceHeader";
import { InvoiceClientSection } from "./InvoiceClientSection";
import { InvoiceTable } from "./InvoiceTable";
import { InvoiceTotals } from "./InvoiceTotals";
import { InvoiceFooter } from "./InvoiceFooter";

interface Props {
  data: InvoicePdfData;
  config: InvoicePdfConfig;
}

export function InvoiceTemplate({ data, config }: Props) {
  return (
    <Page size="A4" style={styles.page}>
      {/* Page number — fixed on every page */}
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `${config.labels.page} ${pageNumber} / ${totalPages}`
        }
        fixed
      />

      {/* Header — company info */}
      <InvoiceHeader config={config} />

      {/* Invoice meta + Client */}
      <InvoiceClientSection data={data} config={config} />

      {/* Line items table — multi-page safe */}
      <View style={styles.tableWrapper}>
        <InvoiceTable lines={data.lines} config={config} />
      </View>

      {/* Totals */}
      <InvoiceTotals data={data} config={config} />

      {/* Footer — notes + legal */}
      <InvoiceFooter data={data} config={config} />
    </Page>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 80,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a202c",
  },
  tableWrapper: {
    marginTop: 4,
  },
  pageNumber: {
    position: "absolute",
    top: 16,
    right: 40,
    fontSize: 7,
    color: "#a0aec0",
  },
});

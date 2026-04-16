import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { InvoicePdfConfig, InvoicePdfData } from "./invoicePdf.types";

interface Props {
  data: InvoicePdfData;
  config: InvoicePdfConfig;
}

export function InvoiceTotals({ data, config }: Props) {
  const styles = createStyles(config);
  const fmt = (n: number) =>
    new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const currencyLabel = config.currency;

  return (
    <View style={styles.container}>
      {/* Spacer pushes totals to the right */}
      <View style={styles.spacer} />

      <View style={styles.totals}>
        {/* Subtotal HT */}
        <View style={styles.row}>
          <Text style={styles.label}>{config.labels.subtotal}</Text>
          <Text style={styles.value}>
            {fmt(data.subtotalHt)} {currencyLabel}
          </Text>
        </View>

        {/* TVA */}
        <View style={styles.row}>
          <Text style={styles.label}>
            {config.labels.tva} ({(data.tvaRate * 100).toFixed(0)}%)
          </Text>
          <Text style={styles.value}>
            {fmt(data.totalTva)} {currencyLabel}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Total TTC */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{config.labels.totalTtc}</Text>
          <Text style={styles.totalValue}>
            {fmt(data.totalTtc)} {currencyLabel}
          </Text>
        </View>

        {/* Amount paid (optional) */}
        {data.amountPaid !== undefined && data.amountPaid > 0 && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Montant payé</Text>
              <Text style={[styles.value, { color: "#38a169" }]}>
                -{fmt(data.amountPaid)} {currencyLabel}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { fontWeight: "bold" }]}>Reste à payer</Text>
              <Text style={[styles.value, { fontWeight: "bold", color: "#e53e3e" }]}>
                {fmt(data.totalTtc - data.amountPaid)} {currencyLabel}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function createStyles(config: InvoicePdfConfig) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      marginTop: 20,
    },
    spacer: {
      flex: 1,
    },
    totals: {
      width: 220,
      padding: 12,
      backgroundColor: "#f8fafc",
      borderRadius: 4,
      borderWidth: 0.5,
      borderColor: "#e2e8f0",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    label: {
      fontSize: 9,
      color: config.secondaryColor,
    },
    value: {
      fontSize: 9,
      color: "#1a202c",
      textAlign: "right",
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: config.primaryColor,
      marginVertical: 6,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    totalLabel: {
      fontSize: 12,
      fontWeight: "bold",
      color: config.primaryColor,
    },
    totalValue: {
      fontSize: 12,
      fontWeight: "bold",
      color: config.primaryColor,
      textAlign: "right",
    },
  });
}

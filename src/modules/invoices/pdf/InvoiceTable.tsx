import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { InvoicePdfConfig, InvoicePdfLine } from "./invoicePdf.types";

interface Props {
  lines: InvoicePdfLine[];
  config: InvoicePdfConfig;
}

export function InvoiceTable({ lines, config }: Props) {
  const styles = createStyles(config);
  const fmt = (n: number) =>
    new Intl.NumberFormat(config.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <View wrap>
      {/* Table header */}
      <View style={styles.headerRow} fixed>
        <Text style={[styles.cell, styles.descCell, styles.headerText]}>
          {config.labels.description}
        </Text>
        <Text style={[styles.cell, styles.qtyCell, styles.headerText]}>
          {config.labels.quantity}
        </Text>
        <Text style={[styles.cell, styles.priceCell, styles.headerText]}>
          {config.labels.unitPriceHt}
        </Text>
        <Text style={[styles.cell, styles.priceCell, styles.headerText]}>
          {config.labels.totalHt}
        </Text>
        <Text style={[styles.cell, styles.priceCell, styles.headerText]}>
          {config.labels.tva}
        </Text>
        <Text style={[styles.cell, styles.priceCell, styles.headerText]}>
          {config.labels.totalTtc}
        </Text>
      </View>

      {/* Table rows */}
      {lines.map((line, i) => (
        <View
          key={i}
          style={[styles.row, i % 2 === 0 ? styles.rowEven : styles.rowOdd]}
          wrap={false}
        >
          <Text style={[styles.cell, styles.descCell, styles.bodyText]}>
            {line.label}
          </Text>
          <Text style={[styles.cell, styles.qtyCell, styles.bodyText, styles.centered]}>
            {line.quantity}
          </Text>
          <Text style={[styles.cell, styles.priceCell, styles.bodyText, styles.rightAlign]}>
            {fmt(line.unitPriceHt)}
          </Text>
          <Text style={[styles.cell, styles.priceCell, styles.bodyText, styles.rightAlign]}>
            {fmt(line.totalHt)}
          </Text>
          <Text style={[styles.cell, styles.priceCell, styles.bodyText, styles.rightAlign]}>
            {(line.tvaRate * 100).toFixed(0)}%
          </Text>
          <Text style={[styles.cell, styles.priceCell, styles.bodyText, styles.rightAlign]}>
            {fmt(line.totalTtc)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(config: InvoicePdfConfig) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      backgroundColor: config.primaryColor,
      paddingVertical: 8,
      paddingHorizontal: 4,
      borderRadius: 2,
    },
    row: {
      flexDirection: "row",
      paddingVertical: 7,
      paddingHorizontal: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e2e8f0",
    },
    rowEven: {
      backgroundColor: "#ffffff",
    },
    rowOdd: {
      backgroundColor: "#f8fafc",
    },
    cell: {
      paddingHorizontal: 4,
    },
    descCell: {
      flex: 3,
    },
    qtyCell: {
      flex: 0.8,
    },
    priceCell: {
      flex: 1.2,
    },
    headerText: {
      fontSize: 8,
      fontWeight: "bold",
      color: "#ffffff",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    bodyText: {
      fontSize: 9,
      color: "#1a202c",
    },
    centered: {
      textAlign: "center",
    },
    rightAlign: {
      textAlign: "right",
    },
  });
}

import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { InvoicePdfConfig, InvoicePdfData } from "./invoicePdf.types";

interface Props {
  data: InvoicePdfData;
  config: InvoicePdfConfig;
}

export function InvoiceFooter({ data, config }: Props) {
  if (!config.showFooter) return null;

  const styles = createStyles(config);

  return (
    <View style={styles.footer} fixed>
      {/* Notes */}
      {data.notes && (
        <View style={styles.notesBlock}>
          <Text style={styles.notesLabel}>{config.labels.notes}</Text>
          <Text style={styles.notesText}>{data.notes}</Text>
        </View>
      )}

      {/* Legal / footer text */}
      {config.footerText && (
        <Text style={styles.legal}>{config.footerText}</Text>
      )}

      {/* Company signature line */}
      <View style={styles.signatureLine}>
        <Text style={styles.signatureText}>{config.companyName}</Text>
      </View>
    </View>
  );
}

function createStyles(config: InvoicePdfConfig) {
  return StyleSheet.create({
    footer: {
      position: "absolute",
      bottom: 30,
      left: 40,
      right: 40,
      borderTopWidth: 0.5,
      borderTopColor: "#e2e8f0",
      paddingTop: 10,
    },
    notesBlock: {
      marginBottom: 8,
    },
    notesLabel: {
      fontSize: 8,
      fontWeight: "bold",
      color: config.secondaryColor,
      textTransform: "uppercase",
      letterSpacing: 0.3,
      marginBottom: 3,
    },
    notesText: {
      fontSize: 8,
      color: "#4a5568",
      lineHeight: 1.4,
    },
    legal: {
      fontSize: 7,
      color: "#a0aec0",
      textAlign: "center",
      marginBottom: 6,
    },
    signatureLine: {
      alignItems: "flex-end",
    },
    signatureText: {
      fontSize: 8,
      color: config.secondaryColor,
      fontStyle: "italic",
    },
  });
}

import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { InvoicePdfConfig } from "./invoicePdf.types";

interface Props {
  config: InvoicePdfConfig;
}

export function InvoiceHeader({ config }: Props) {
  const styles = createStyles(config);

  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Text style={styles.companyName}>{config.companyName}</Text>
        {config.companyTaxId && (
          <Text style={styles.meta}>{config.companyTaxId}</Text>
        )}
      </View>
      <View style={styles.details}>
        {config.companyAddress && (
          <Text style={styles.meta}>{config.companyAddress}</Text>
        )}
        {config.companyPhone && (
          <Text style={styles.meta}>{config.companyPhone}</Text>
        )}
        {config.companyEmail && (
          <Text style={styles.meta}>{config.companyEmail}</Text>
        )}
      </View>
    </View>
  );
}

function createStyles(config: InvoicePdfConfig) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 24,
      paddingBottom: 16,
      borderBottomWidth: 2,
      borderBottomColor: config.primaryColor,
    },
    brand: {
      flexDirection: "column",
    },
    companyName: {
      fontSize: 22,
      fontWeight: "bold",
      color: config.primaryColor,
    },
    details: {
      alignItems: "flex-end",
    },
    meta: {
      fontSize: 9,
      color: config.secondaryColor,
      marginTop: 2,
    },
  });
}

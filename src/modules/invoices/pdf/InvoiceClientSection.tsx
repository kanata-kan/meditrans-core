import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { InvoicePdfConfig, InvoicePdfData } from "./invoicePdf.types";

interface Props {
  data: InvoicePdfData;
  config: InvoicePdfConfig;
}

export function InvoiceClientSection({ data, config }: Props) {
  const styles = createStyles(config);

  return (
    <View style={styles.container}>
      {/* Left — Invoice info */}
      <View style={styles.invoiceInfo}>
        <Text style={styles.title}>{config.labels.invoiceTitle}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>{config.labels.invoiceNumber}:</Text>
          <Text style={styles.value}>{data.invoiceNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{config.labels.issueDate}:</Text>
          <Text style={styles.value}>{data.issueDate}</Text>
        </View>
        {data.dueDate && (
          <View style={styles.row}>
            <Text style={styles.label}>{config.labels.dueDate}:</Text>
            <Text style={styles.value}>{data.dueDate}</Text>
          </View>
        )}
      </View>

      {/* Right — Client info */}
      <View style={styles.clientInfo}>
        <Text style={styles.sectionLabel}>{config.labels.client}</Text>
        <Text style={styles.clientName}>{data.client.name}</Text>
        {data.client.phone && (
          <Text style={styles.clientMeta}>{data.client.phone}</Text>
        )}
        {data.client.email && (
          <Text style={styles.clientMeta}>{data.client.email}</Text>
        )}
        {data.client.address && (
          <Text style={styles.clientMeta}>{data.client.address}</Text>
        )}
        {data.patientName && (
          <View style={styles.patientRow}>
            <Text style={styles.sectionLabel}>{config.labels.patient}</Text>
            <Text style={styles.clientMeta}>{data.patientName}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function createStyles(config: InvoicePdfConfig) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    invoiceInfo: {
      flexDirection: "column",
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: config.primaryColor,
      marginBottom: 8,
    },
    row: {
      flexDirection: "row",
      gap: 6,
      marginBottom: 3,
    },
    label: {
      fontSize: 9,
      color: config.secondaryColor,
      fontWeight: "bold",
    },
    value: {
      fontSize: 9,
      color: "#1a202c",
    },
    clientInfo: {
      alignItems: "flex-end",
      maxWidth: 200,
    },
    sectionLabel: {
      fontSize: 8,
      fontWeight: "bold",
      color: config.secondaryColor,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    clientName: {
      fontSize: 12,
      fontWeight: "bold",
      color: "#1a202c",
      marginBottom: 2,
    },
    clientMeta: {
      fontSize: 9,
      color: config.secondaryColor,
      marginBottom: 1,
      textAlign: "right",
    },
    patientRow: {
      marginTop: 8,
      alignItems: "flex-end",
    },
  });
}

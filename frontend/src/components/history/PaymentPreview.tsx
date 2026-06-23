import { Download, Share2, X } from "lucide-react";
import { useRef, useState } from "react";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import html2canvas from "html2canvas";
import { usePaymentById } from "@/hooks/useHistory";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SheetClose } from "@/components/ui/sheet";

interface PaymentPreviewProps {
  id: string;
}

const STATUS_COLOR: Record<string, string> = {
  Approved: "text-[var(--success)]",
  Pending: "text-[var(--pending)]",
  Rejected: "text-[#ef4444]",
  "Under Review": "text-[#3b82f6]",
};

const STATUS_BG: Record<string, string> = {
  Approved: "bg-[#10b98120]",
  Pending: "bg-[#f59e0b20]",
  Rejected: "bg-[#ef444420]",
  "Under Review": "bg-[#3b82f620]",
};

const pdfStyles = StyleSheet.create({
  page: {
    padding: 50,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  container: {
    marginBottom: 40,
  },
  header: {
    marginBottom: 40,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#e5e7eb",
  },
  companyName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#1f2937",
  },
  receiptTitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 15,
  },
  receiptNumber: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 2,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1f2937",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountSection: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  amountLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#10b981",
    backgroundColor: "#d1fae5",
    padding: 4,
    borderRadius: 3,
    display: "flex",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  label: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "500",
  },
  value: {
    fontSize: 11,
    color: "#1f2937",
    fontWeight: "500",
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    textAlign: "center",
  },
  footerText: {
    fontSize: 9,
    color: "#9ca3af",
  },
});

interface ReceiptPDFProps {
  payment: any;
}

function ReceiptPDF({ payment }: ReceiptPDFProps) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.companyName}>SpaceX Membership</Text>
          <Text style={pdfStyles.receiptTitle}>Payment Receipt</Text>
          <Text style={pdfStyles.receiptNumber}>Receipt #{payment.reference}</Text>
        </View>

        {/* Amount Section */}
        <View style={pdfStyles.amountSection}>
          <Text style={pdfStyles.amountLabel}>Total Amount</Text>
          <Text style={pdfStyles.amountValue}>{payment.amount}</Text>
          <Text
            style={{
              ...pdfStyles.statusBadge,
              color: payment.status === "Approved" ? "#10b981" : "#f59e0b",
              backgroundColor:
                payment.status === "Approved" ? "#d1fae5" : "#fef3c7",
            }}
          >
            {payment.status}
          </Text>
        </View>

        {/* Details Section */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Payment Details</Text>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Membership Tier</Text>
            <Text style={pdfStyles.value}>{payment.tier}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Payment Date</Text>
            <Text style={pdfStyles.value}>{payment.date}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Receipt Date</Text>
            <Text style={pdfStyles.value}>{currentDate}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Payment Status</Text>
            <Text style={pdfStyles.value}>{payment.status}</Text>
          </View>
        </View>

        {/* Terms Section */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Terms</Text>
          <Text style={{ fontSize: 9, color: "#6b7280", lineHeight: 1.5 }}>
            This payment receipt confirms the successful transaction for your SpaceX membership
            tier upgrade. Your membership benefits are now active.
          </Text>
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerText}>
            Generated on {currentDate} • This receipt is a valid proof of payment
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export function PaymentPreview({ id }: PaymentPreviewProps) {
  const { data: payment, isLoading } = usePaymentById(id || "");
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleShareAsImage = async () => {
    if (!receiptRef.current) return;
    setIsSharing(true);
    try {
      const canvas = await html2canvas(receiptRef.current, { backgroundColor: "#ffffff" });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `receipt-${payment?.id}.png`, { type: "image/png" });

        if (navigator.share) {
          try {
            await navigator.share({
              files: [file],
              title: `Receipt for ${payment?.tier} - ${payment?.date}`,
            });
          } catch (error) {
            console.log("Share cancelled or failed");
          }
        } else {
          // Fallback: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `receipt-${payment?.id}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch (error) {
      console.error("Error sharing image:", error);
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center pt-12">
        <Loader size={24} />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-8">
        <p className="text-sm text-[var(--muted)]">Payment not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="relative flex items-center justify-center px-6 py-4 border-b border-[var(--border)]">
        <SheetClose asChild>
          <button
            className="absolute left-4 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface)] transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </SheetClose>
        <h2 className="text-lg font-semibold text-[var(--text)]">Payment Receipt</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Amount Card - Prominent */}
          <Card className="bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] border-[var(--border)] p-6 space-y-3">
            <div>
              <p className="text-xs text-[var(--muted)] uppercase font-semibold tracking-wider">
                Total Amount
              </p>
              <p className="text-4xl font-bold text-[var(--text)] mt-2">{payment.amount}</p>
            </div>
            <div className="pt-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[payment.status]} ${STATUS_BG[payment.status]}`}
              >
                {payment.status}
              </span>
            </div>
          </Card>

          {/* Receipt Details Card */}
          <Card className="border-[var(--border)] p-6 space-y-4" ref={receiptRef}>
            <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">
              Receipt Details
            </h3>

            <div className="space-y-3">
              {/* Membership Tier */}
              <div className="flex justify-between items-start pb-3 border-b border-[var(--border)]">
                <span className="text-xs text-[var(--muted)] uppercase font-medium">Membership Tier</span>
                <span className="text-sm font-semibold text-[var(--text)]">{payment.tier}</span>
              </div>

              {/* Reference */}
              <div className="flex justify-between items-start pb-3 border-b border-[var(--border)]">
                <span className="text-xs text-[var(--muted)] uppercase font-medium">Reference</span>
                <span className="text-sm font-mono text-[var(--text)]">{payment.reference}</span>
              </div>

              {/* Date */}
              <div className="flex justify-between items-start pb-3 border-b border-[var(--border)]">
                <span className="text-xs text-[var(--muted)] uppercase font-medium">Payment Date</span>
                <span className="text-sm text-[var(--text)]">{payment.date}</span>
              </div>

              {/* Status */}
              <div className="flex justify-between items-start">
                <span className="text-xs text-[var(--muted)] uppercase font-medium">Status</span>
                <span className={`text-sm font-semibold ${STATUS_COLOR[payment.status]}`}>
                  {payment.status}
                </span>
              </div>
            </div>
          </Card>

          {/* Terms & Conditions */}
          <Card className="border-[var(--border)] p-4 bg-[var(--surface)] bg-opacity-50">
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              This payment receipt confirms your successful transaction for SpaceX membership tier
              upgrade. Your membership benefits are now active. Please keep this receipt for your
              records.
            </p>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-[var(--border)] px-6 py-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Download PDF */}
          <PDFDownloadLink
            document={<ReceiptPDF payment={payment} />}
            fileName={`receipt-${payment.id}.pdf`}
          >
            {({ loading }) => (
              <Button
                disabled={loading}
                variant="outline"
                className="w-full gap-2"
                size="sm"
              >
                <Download size={16} />
                <span>{loading ? "..." : "Download"}</span>
              </Button>
            )}
          </PDFDownloadLink>

          {/* Share */}
          <Button
            onClick={handleShareAsImage}
            disabled={isSharing}
            className="w-full gap-2 bg-[var(--text)] text-[var(--bg)] hover:opacity-90"
            size="sm"
          >
            <Share2 size={16} />
            <span>{isSharing ? "..." : "Share"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

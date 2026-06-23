import { Download, FileText } from "lucide-react";
import { jsPDF } from "jspdf";
import type { PaymentRecord } from "@/types/payment";

interface InvoiceExportProps {
  payment: PaymentRecord;
}

export function InvoiceExport({ payment }: InvoiceExportProps) {
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const lineHeight = 7;

    // Header
    doc.setFontSize(20);
    doc.text("Invoice", margin, margin + 10);

    // Invoice details
    doc.setFontSize(10);
    doc.text(`Reference: ${payment.reference}`, margin, margin + 25);
    doc.text(`Date: ${payment.date}`, margin, margin + 25 + lineHeight);
    doc.text(`Status: ${payment.status}`, margin, margin + 25 + lineHeight * 2);

    // Details table
    const detailsY = margin + 50;
    doc.setFontSize(11);
    doc.text("Payment Details", margin, detailsY);

    doc.setFontSize(10);
    const tableStartY = detailsY + lineHeight + 5;
    const labelX = margin;
    const valueX = margin + 50;

    doc.text("Tier:", labelX, tableStartY);
    doc.text(payment.tier, valueX, tableStartY);

    doc.text("Amount:", labelX, tableStartY + lineHeight * 2);
    doc.text(payment.amount, valueX, tableStartY + lineHeight * 2);

    doc.text("Status:", labelX, tableStartY + lineHeight * 4);
    doc.setTextColor(
      payment.status === "Approved" ? 16 : payment.status === "Pending" ? 245 : 239,
      payment.status === "Approved" ? 185 : payment.status === "Pending" ? 158 : 68,
      payment.status === "Approved" ? 129 : payment.status === "Pending" ? 0 : 68
    );
    doc.text(payment.status, valueX, tableStartY + lineHeight * 4);

    // Footer
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.text(
      "This invoice was generated on " + new Date().toLocaleDateString(),
      margin,
      pageHeight - margin
    );

    // Save PDF
    doc.save(`invoice-${payment.reference}.pdf`);
  };

  const handleExportCSV = () => {
    const csvContent = [
      ["Field", "Value"],
      ["Reference", payment.reference],
      ["Date", payment.date],
      ["Tier", payment.tier],
      ["Amount", payment.amount],
      ["Status", payment.status],
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent)
    );
    element.setAttribute("download", `invoice-${payment.reference}.csv`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
      <button
        onClick={handleExportPDF}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#3b82f6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2563eb]"
      >
        <FileText size={16} />
        <span>Export PDF</span>
      </button>
      <button
        onClick={handleExportCSV}
        className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-bright)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-white/5"
      >
        <Download size={16} />
        <span>Export CSV</span>
      </button>
    </div>
  );
}

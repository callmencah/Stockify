import {
  formatCurrency,
  formatNumber,
  formatDateTime,
  formatDate,
} from "./utils";

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

export interface ExportColumn {
  header: string;
  key: string;
  /** Relative weight for proportional PDF/Excel column sizing */
  width?: number;
  /** Text alignment in PDF (default: left) */
  align?: "left" | "center" | "right";
  format?: (
    value: unknown,
    row: Record<string, unknown>,
    index?: number,
  ) => string;
}

export interface ExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
  summary?: Record<string, string>;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function cellText(
  col: ExportColumn,
  row: Record<string, unknown>,
  index?: number,
): string {
  const val = getNestedValue(row, col.key);
  if (col.format) return col.format(val, row, index);
  if (val === null || val === undefined) return "-";
  return String(val);
}

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────

export async function exportToExcel(options: ExportOptions): Promise<void> {
  const XLSX = await import("xlsx");

  const { filename, title, subtitle, columns, data, summary } = options;

  const wb = XLSX.utils.book_new();

  // Build worksheet rows
  const rows: (string | number)[][] = [];

  // Title row
  rows.push([title]);
  if (subtitle) rows.push([subtitle]);
  rows.push([`Diekspor: ${formatDateTime(new Date())}`]);
  rows.push([]);

  // Header row
  rows.push(columns.map((c) => c.header));

  // Data rows
  for (let i = 0; i < data.length; i++) {
    rows.push(columns.map((col) => cellText(col, data[i], i)));
  }

  // Summary rows
  if (summary) {
    rows.push([]);
    rows.push(["--- RINGKASAN ---"]);
    for (const [label, value] of Object.entries(summary)) {
      rows.push([label, value]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  const colWidths = columns.map((c) => ({ wch: c.width ?? 20 }));
  ws["!cols"] = colWidths;

  // Style: merge title across all columns
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }];

  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── PDF EXPORT ───────────────────────────────────────────────────────────────

export async function exportToPDF(options: ExportOptions): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const { filename, title, subtitle, columns, data, summary } = options;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // ── Header band ──────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 0, pageWidth, 22, "F");

  // Logo placeholder
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 4, 14, 14, 2, 2, "F");
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("S", margin + 5, 13);

  // App name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Stockify", margin + 17, 11);

  // Report title (right side)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(title, pageWidth - margin, 9, { align: "right" });

  if (subtitle) {
    doc.setFontSize(8);
    doc.text(subtitle, pageWidth - margin, 15, { align: "right" });
  }

  // ── Meta info ────────────────────────────────────────────────────
  let yPos = 28;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Diekspor: ${formatDateTime(new Date())}   |   Total Data: ${formatNumber(data.length)}`,
    margin,
    yPos,
  );

  yPos += 3;

  // ── Table ─────────────────────────────────────────────────────────
  const tableHeaders = columns.map((c) => c.header);
  const tableBody = data.map((row, i) =>
    columns.map((col) => cellText(col, row, i)),
  );

  // ── Proportional column widths ──────────────────────────────────
  // Distribute available page width proportionally using column weight.
  // This guarantees headers never get truncated mid-word.
  const availableWidth = pageWidth - 2 * margin;
  const totalWeight = columns.reduce((s, c) => s + (c.width ?? 20), 0);
  const colStyles = columns.reduce(
    (acc, col, idx) => {
      const cellWidth = ((col.width ?? 20) / totalWeight) * availableWidth;
      acc[idx] = {
        cellWidth,
        halign: (col.align ?? "left") as "left" | "center" | "right",
      };
      return acc;
    },
    {} as Record<
      number,
      { cellWidth: number; halign: "left" | "center" | "right" }
    >,
  );

  autoTable(doc, {
    head: [tableHeaders],
    body: tableBody,
    startY: yPos + 2,
    margin: { left: margin, right: margin },
    tableWidth: availableWidth,
    styles: {
      fontSize: 8,
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      overflow: "linebreak",
      lineColor: [220, 220, 220],
      lineWidth: 0.15,
      minCellHeight: 8,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
      minCellHeight: 10,
      overflow: "linebreak",
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    bodyStyles: {
      textColor: [40, 40, 40],
    },
    columnStyles: colStyles,
    didDrawPage: (hookData) => {
      // Footer on every page
      const pageNum = hookData.pageNumber;
      const totalPages = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Stockify — ${title} | Halaman ${pageNum} dari ${totalPages}`,
        margin,
        pageHeight - 8,
      );
      doc.text(
        "© Stockify Inventory Management",
        pageWidth - margin,
        pageHeight - 8,
        { align: "right" },
      );
      // Bottom line
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    },
  });

  // ── Summary box ──────────────────────────────────────────────────
  if (summary) {
    const finalY =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 6;

    if (finalY < pageHeight - 40) {
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(147, 197, 253);
      const boxH = Object.keys(summary).length * 6 + 10;
      doc.roundedRect(margin, finalY, 90, boxH, 2, 2, "FD");

      doc.setFontSize(9);
      doc.setTextColor(30, 64, 175);
      doc.setFont("helvetica", "bold");
      doc.text("Ringkasan", margin + 4, finalY + 7);

      let rowY = finalY + 14;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8);
      for (const [label, value] of Object.entries(summary)) {
        doc.text(`${label}:`, margin + 4, rowY);
        doc.setFont("helvetica", "bold");
        doc.text(value, margin + 4 + 50, rowY, { align: "right" });
        doc.setFont("helvetica", "normal");
        rowY += 6;
      }
    }
  }

  doc.save(`${filename}.pdf`);
}

// ─── PRESET CONFIGS ───────────────────────────────────────────────────────────

export function getStockValueExportConfig(
  data: unknown[],
  totalValue: number,
): ExportOptions {
  return {
    filename: `stockify-nilai-stok-${new Date().toISOString().split("T")[0]}`,
    title: "Laporan Nilai Stok Inventori",
    subtitle: `Per tanggal ${formatDate(new Date())}`,
    columns: [
      { header: "Nama Barang", key: "item.name", width: 38 },
      { header: "SKU", key: "item.sku", width: 22 },
      { header: "Kategori", key: "item.category.name", width: 20 },
      { header: "Lokasi", key: "location.name", width: 26 },
      {
        header: "Qty",
        key: "quantity",
        width: 12,
        align: "right",
        format: (val) => formatNumber(Number(val)),
      },
      {
        header: "Satuan",
        key: "item.unit.abbreviation",
        width: 12,
        align: "center",
      },
      {
        header: "Harga Beli",
        key: "item.buyPrice",
        width: 25,
        align: "right",
        format: (val) => formatCurrency(Number(val)),
      },
      {
        header: "Nilai Stok",
        key: "totalValue",
        width: 25,
        align: "right",
        format: (val) => formatCurrency(Number(val)),
      },
    ],
    data: data as Record<string, unknown>[],
    summary: {
      "Total Item": formatNumber((data as unknown[]).length),
      "Total Nilai Stok": formatCurrency(totalValue),
    },
  };
}

export function getLowStockExportConfig(data: unknown[]): ExportOptions {
  return {
    filename: `stockify-stok-rendah-${new Date().toISOString().split("T")[0]}`,
    title: "Laporan Stok Rendah",
    subtitle: `Per tanggal ${formatDate(new Date())}`,
    columns: [
      { header: "Nama Barang", key: "item.name", width: 36 },
      { header: "SKU", key: "item.sku", width: 20 },
      { header: "Lokasi", key: "location.name", width: 26 },
      {
        header: "Stok Saat Ini",
        key: "quantity",
        width: 18,
        align: "right",
        format: (val) => formatNumber(Number(val)),
      },
      {
        header: "Reorder Point",
        key: "item.reorderPoint",
        width: 18,
        align: "right",
        format: (val) => formatNumber(Number(val)),
      },
      {
        header: "Min. Stok",
        key: "item.minStock",
        width: 15,
        align: "right",
        format: (val) => formatNumber(Number(val)),
      },
      {
        header: "Satuan",
        key: "item.unit.abbreviation",
        width: 13,
        align: "center",
      },
      {
        header: "Status",
        key: "quantity",
        width: 15,
        align: "center",
        format: (val) => {
          const qty = Number(val);
          return qty <= 0 ? "HABIS" : "RENDAH";
        },
      },
    ],
    data: data as Record<string, unknown>[],
    summary: {
      "Total Item Bermasalah": formatNumber((data as unknown[]).length),
      "Item Habis": formatNumber(
        (data as Array<{ quantity: number }>).filter((d) => d.quantity <= 0)
          .length,
      ),
      "Item Rendah": formatNumber(
        (data as Array<{ quantity: number }>).filter((d) => d.quantity > 0)
          .length,
      ),
    },
  };
}

export function getTransactionsExportConfig(data: unknown[]): ExportOptions {
  return {
    filename: `stockify-transaksi-${new Date().toISOString().split("T")[0]}`,
    title: "Laporan Riwayat Transaksi",
    columns: [
      {
        header: "Tanggal & Waktu",
        key: "createdAt",
        width: 28,
        format: (val) => formatDateTime(String(val)),
      },
      {
        header: "Tipe",
        key: "type",
        width: 18,
        format: (val) => {
          const types: Record<string, string> = {
            PURCHASE: "Pembelian",
            SALE: "Penjualan",
            TRANSFER_IN: "Transfer Masuk",
            TRANSFER_OUT: "Transfer Keluar",
            ADJUSTMENT: "Penyesuaian",
            RETURN_IN: "Retur Masuk",
            RETURN_OUT: "Retur Keluar",
            OPNAME: "Stock Opname",
          };
          return types[String(val)] || String(val);
        },
      },
      { header: "Barang", key: "item.name", width: 30 },
      { header: "SKU", key: "item.sku", width: 18 },
      { header: "Dari Lokasi", key: "fromLocation.name", width: 22 },
      { header: "Ke Lokasi", key: "toLocation.name", width: 22 },
      {
        header: "Qty",
        key: "quantity",
        width: 11,
        align: "right",
        format: (val) => formatNumber(Number(val)),
      },
      {
        header: "Satuan",
        key: "item.unit.abbreviation",
        width: 11,
        align: "center",
      },
      { header: "Referensi", key: "reference", width: 22 },
      { header: "User", key: "user.name", width: 18 },
    ],
    data: data as Record<string, unknown>[],
    summary: {
      "Total Transaksi": formatNumber((data as unknown[]).length),
    },
  };
}

export function getSalesSummaryExportConfig(
  data: unknown[],
  totalRevenue: number,
): ExportOptions {
  return {
    filename: `stockify-penjualan-${new Date().toISOString().split("T")[0]}`,
    title: "Laporan Rangkuman Penjualan",
    columns: [
      {
        header: "No",
        key: "__index",
        width: 8,
        align: "center",
        format: (_, __, idx) => String((idx as number) + 1),
      },
      { header: "Nama Barang", key: "item.name", width: 40 },
      { header: "SKU", key: "item.sku", width: 22 },
      {
        header: "Total Qty Terjual",
        key: "totalQty",
        width: 18,
        align: "right",
        format: (val) => formatNumber(Number(val)),
      },
      {
        header: "Total Pendapatan",
        key: "totalRevenue",
        width: 24,
        align: "right",
        format: (val) => formatCurrency(Number(val)),
      },
    ],
    data: data as Record<string, unknown>[],
    summary: {
      "Total Item Terjual": formatNumber((data as unknown[]).length),
      "Total Pendapatan": formatCurrency(totalRevenue),
    },
  };
}

export function getAuditLogExportConfig(data: unknown[]): ExportOptions {
  return {
    filename: `stockify-audit-log-${new Date().toISOString().split("T")[0]}`,
    title: "Laporan Audit Trail",
    columns: [
      {
        header: "Waktu",
        key: "createdAt",
        width: 28,
        format: (val) => formatDateTime(String(val)),
      },
      { header: "Pengguna", key: "user.name", width: 20 },
      { header: "Email", key: "user.email", width: 28 },
      { header: "Aksi", key: "action", width: 14, align: "center" },
      { header: "Entitas", key: "entity", width: 18 },
      { header: "ID Entitas", key: "entityId", width: 26 },
    ],
    data: data as Record<string, unknown>[],
    summary: {
      "Total Log": formatNumber((data as unknown[]).length),
    },
  };
}

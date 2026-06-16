"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportOptions, exportToExcel, exportToPDF } from "@/lib/export";

interface ExportButtonProps {
  getConfig: () => ExportOptions;
  disabled?: boolean;
  size?: "sm" | "default";
}

export function ExportButton({ getConfig, disabled, size = "sm" }: ExportButtonProps) {
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  const handleExport = async (type: "pdf" | "excel") => {
    setExporting(type);
    const toastId = toast.loading(
      type === "pdf" ? "Membuat PDF..." : "Membuat Excel..."
    );
    try {
      const config = getConfig();
      if (config.data.length === 0) {
        toast.dismiss(toastId);
        toast.warning("Tidak ada data untuk diekspor");
        return;
      }
      if (type === "pdf") {
        await exportToPDF(config);
        toast.success(`PDF berhasil diunduh: ${config.filename}.pdf`, { id: toastId });
      } else {
        await exportToExcel(config);
        toast.success(`Excel berhasil diunduh: ${config.filename}.xlsx`, { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengekspor. Coba lagi.", { id: toastId });
    } finally {
      setExporting(null);
    }
  };

  const isLoading = exporting !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          disabled={disabled || isLoading}
          className="gap-1.5"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )}
          {isLoading
            ? exporting === "pdf"
              ? "PDF..."
              : "Excel..."
            : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Pilih Format
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleExport("pdf")}
          disabled={isLoading}
          className="gap-2 cursor-pointer"
        >
          <FileText className="h-4 w-4 text-red-500" />
          <div>
            <p className="text-sm font-medium">Export PDF</p>
            <p className="text-xs text-muted-foreground">Format cetak</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("excel")}
          disabled={isLoading}
          className="gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          <div>
            <p className="text-sm font-medium">Export Excel</p>
            <p className="text-xs text-muted-foreground">Format .xlsx</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

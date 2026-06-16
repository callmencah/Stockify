"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Location } from "@/types";
import { TRANSACTION_TYPES } from "@/lib/constants";
import { ExportButton } from "@/components/export-button";
import {
  getStockValueExportConfig,
  getLowStockExportConfig,
  getTransactionsExportConfig,
  getSalesSummaryExportConfig,
  getAuditLogExportConfig,
} from "@/lib/export";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type StockValueRow = {
  item: {
    id: string;
    name: string;
    sku: string;
    buyPrice: number;
    unit?: { abbreviation: string };
    category?: { name: string };
  };
  location: { name: string };
  quantity: number;
  totalValue: number;
};

type LowStockRow = {
  id: string;
  quantity: number;
  item: {
    name: string;
    sku: string;
    reorderPoint: number;
    minStock: number;
    unit?: { abbreviation: string };
  };
  location: { name: string };
};

type TransactionRow = {
  id: string;
  type: string;
  createdAt: string;
  item?: { name: string; unit?: { abbreviation: string } };
  fromLocation?: { name: string };
  toLocation?: { name: string };
  quantity: number;
  reference?: string;
  user?: { name: string };
};

type SalesRow = {
  item: { name: string; sku: string };
  totalQty: number;
  totalRevenue: number;
};

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  createdAt: string;
  user?: { name: string; email: string };
};

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [locationId, setLocationId] = useState("all");

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: () => api.get("/api/locations"),
  });

  const locParam = locationId !== "all" ? `&locationId=${locationId}` : "";

  const { data: stockValue } = useQuery<{
    data: StockValueRow[];
    totalValue: number;
  }>({
    queryKey: ["report-stock-value", locationId],
    queryFn: () => api.get(`/api/reports?type=stock_value${locParam}`),
  });

  const { data: lowStock } = useQuery<LowStockRow[]>({
    queryKey: ["report-low-stock", locationId],
    queryFn: () => api.get(`/api/reports?type=low_stock${locParam}`),
  });

  const { data: transactions } = useQuery<TransactionRow[]>({
    queryKey: ["report-transactions", startDate, endDate, locationId],
    queryFn: () =>
      api.get(
        `/api/reports?type=transactions&startDate=${startDate}&endDate=${endDate}${locParam}`,
      ),
  });

  const { data: salesSummary } = useQuery<SalesRow[]>({
    queryKey: ["report-sales", startDate, endDate, locationId],
    queryFn: () =>
      api.get(
        `/api/reports?type=sales_summary&startDate=${startDate}&endDate=${endDate}${locParam}`,
      ),
  });

  const { data: auditLogs } = useQuery<AuditRow[]>({
    queryKey: ["report-audit"],
    queryFn: () => api.get("/api/reports?type=audit_log"),
  });

  const stockValueData = stockValue?.data ?? [];
  const totalStockValue = stockValue?.totalValue ?? 0;
  const totalSalesRevenue =
    salesSummary?.reduce((sum, s) => sum + s.totalRevenue, 0) ?? 0;

  // ─── FILTER BAR ─────────────────────────────────────────────────────────────
  const filterBar = (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Tanggal Mulai</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tanggal Akhir</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Lokasi</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Lokasi</SelectItem>
                {locations?.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Laporan & Analitik</h1>
        <p className="text-muted-foreground">
          Analisis performa inventori Anda — ekspor ke PDF atau Excel
        </p>
      </div>

      {filterBar}

      <Tabs defaultValue="stock-value">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="stock-value">Nilai Stok</TabsTrigger>
          <TabsTrigger value="low-stock">Stok Rendah</TabsTrigger>
          <TabsTrigger value="transactions">Transaksi</TabsTrigger>
          <TabsTrigger value="sales">Penjualan</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        {/* ── NILAI STOK ────────────────────────────────────────────── */}
        <TabsContent value="stock-value">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Nilai Stok Inventori</CardTitle>
                  <CardDescription>
                    Total:{" "}
                    <span className="font-bold text-foreground">
                      {formatCurrency(totalStockValue)}
                    </span>{" "}
                    — {formatNumber(stockValueData.length)} item
                  </CardDescription>
                </div>
                <ExportButton
                  getConfig={() =>
                    getStockValueExportConfig(stockValueData, totalStockValue)
                  }
                  disabled={stockValueData.length === 0}
                />
              </div>
            </CardHeader>
            <CardContent>
              {stockValueData.length > 0 && (
                <div className="mb-6">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stockValueData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="item.name"
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tickFormatter={(v) =>
                          formatCurrency(v).replace("Rp\u00a0", "")
                        }
                      />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar
                        dataKey="totalValue"
                        fill="#3b82f6"
                        name="Nilai Stok"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barang</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga Beli</TableHead>
                    <TableHead className="text-right">Nilai Stok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockValueData.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <p className="font-medium">{row.item?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.item?.sku}
                        </p>
                      </TableCell>
                      <TableCell>{row.location?.name}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(row.quantity)}{" "}
                        {row.item?.unit?.abbreviation}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.item?.buyPrice || 0)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(row.totalValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {stockValueData.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Tidak ada data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── STOK RENDAH ───────────────────────────────────────────── */}
        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Barang Stok Rendah
                    <Badge variant="warning">
                      {lowStock?.length ?? 0} item
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Item yang mendekati atau melewati reorder point
                  </CardDescription>
                </div>
                <ExportButton
                  getConfig={() => getLowStockExportConfig(lowStock ?? [])}
                  disabled={!lowStock?.length}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barang</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead className="text-right">Stok Saat Ini</TableHead>
                    <TableHead className="text-right">Reorder Point</TableHead>
                    <TableHead className="text-right">Min. Stok</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock?.map((il) => (
                    <TableRow key={il.id}>
                      <TableCell>
                        <p className="font-medium">{il.item?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {il.item?.sku}
                        </p>
                      </TableCell>
                      <TableCell>{il.location?.name}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        {formatNumber(il.quantity)}{" "}
                        {il.item?.unit?.abbreviation}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(il.item?.reorderPoint)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(il.item?.minStock)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={il.quantity <= 0 ? "destructive" : "warning"}
                        >
                          {il.quantity <= 0 ? "Habis" : "Rendah"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!lowStock?.length && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Semua stok dalam kondisi normal 🎉
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── RIWAYAT TRANSAKSI ─────────────────────────────────────── */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Riwayat Transaksi</CardTitle>
                  <CardDescription>
                    {formatNumber(transactions?.length ?? 0)} transaksi
                    ditemukan
                  </CardDescription>
                </div>
                <ExportButton
                  getConfig={() =>
                    getTransactionsExportConfig(transactions ?? [])
                  }
                  disabled={!transactions?.length}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Barang</TableHead>
                    <TableHead>Dari</TableHead>
                    <TableHead>Ke</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Referensi</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.map((tx) => {
                    const txType =
                      TRANSACTION_TYPES[
                        tx.type as keyof typeof TRANSACTION_TYPES
                      ];
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs">
                          {formatDateTime(tx.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {txType?.label || tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {tx.item?.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {tx.fromLocation?.name || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {tx.toLocation?.name || "-"}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatNumber(tx.quantity)}{" "}
                          {tx.item?.unit?.abbreviation}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {tx.reference || "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {tx.user?.name}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!transactions?.length && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Tidak ada transaksi dalam periode ini
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── RANGKUMAN PENJUALAN ───────────────────────────────────── */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Rangkuman Penjualan</CardTitle>
                  <CardDescription>
                    Total Pendapatan:{" "}
                    <span className="font-bold text-foreground">
                      {formatCurrency(totalSalesRevenue)}
                    </span>
                  </CardDescription>
                </div>
                <ExportButton
                  getConfig={() =>
                    getSalesSummaryExportConfig(
                      salesSummary ?? [],
                      totalSalesRevenue,
                    )
                  }
                  disabled={!salesSummary?.length}
                />
              </div>
            </CardHeader>
            <CardContent>
              {salesSummary && salesSummary.length > 0 && (
                <div className="mb-6">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={salesSummary.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="item.name"
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tickFormatter={(v) =>
                          formatCurrency(v).replace("Rp\u00a0", "")
                        }
                      />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar
                        dataKey="totalRevenue"
                        fill="#10b981"
                        name="Pendapatan"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Barang</TableHead>
                    <TableHead className="text-right">
                      Total Qty Terjual
                    </TableHead>
                    <TableHead className="text-right">
                      Total Pendapatan
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesSummary?.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground text-sm">
                        {i + 1}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{s.item?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.item?.sku}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(s.totalQty)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        {formatCurrency(s.totalRevenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!salesSummary?.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Tidak ada data penjualan dalam periode ini
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AUDIT TRAIL ───────────────────────────────────────────── */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Audit Trail</CardTitle>
                  <CardDescription>
                    Log aktivitas pengguna —{" "}
                    {formatNumber(auditLogs?.length ?? 0)} entri
                  </CardDescription>
                </div>
                <ExportButton
                  getConfig={() => getAuditLogExportConfig(auditLogs ?? [])}
                  disabled={!auditLogs?.length}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Pengguna</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Entitas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.user?.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.action === "DELETE"
                              ? "destructive"
                              : log.action === "CREATE"
                                ? "success"
                                : "default"
                          }
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{log.entity}</span>
                        {log.entityId && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({log.entityId.slice(0, 8)}…)
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!auditLogs?.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Tidak ada log aktivitas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/utils";
import {
  Package,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  TruckIcon,
  ArrowUpDown,
  Warehouse,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TRANSACTION_TYPES } from "@/lib/constants";

interface DashboardData {
  stats: {
    totalItems: number;
    totalLocations: number;
    totalStockValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    pendingPOs: number;
    pendingSOs: number;
    todayTransactions: number;
    unreadNotifications: number;
  };
  recentTransactions: Array<{
    id: string;
    type: string;
    quantity: number;
    createdAt: string;
    item: { name: string; sku: string };
    user: { name: string };
    fromLocation?: { name: string } | null;
    toLocation?: { name: string } | null;
  }>;
  lowStockItems: Array<{
    id: string;
    quantity: number;
    item: { name: string; sku: string; reorderPoint: number; minStock: number; unit?: { abbreviation: string } };
    location: { name: string };
  }>;
  stockByLocation: Array<{ name: string; value: number; items: number }>;
  monthlyData: Array<{ month: string; purchases: number; sales: number }>;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/api/dashboard"),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const { stats, recentTransactions, lowStockItems, stockByLocation, monthlyData } = data!;

  const statCards = [
    {
      title: "Total Barang",
      value: formatNumber(stats.totalItems),
      description: "Item aktif",
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Nilai Stok",
      value: formatCurrency(stats.totalStockValue),
      description: "Total nilai inventori",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Stok Rendah",
      value: formatNumber(stats.lowStockCount),
      description: "Item perlu reorder",
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Stok Habis",
      value: formatNumber(stats.outOfStockCount),
      description: "Item kehabisan stok",
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "PO Pending",
      value: formatNumber(stats.pendingPOs),
      description: "Purchase order aktif",
      icon: TruckIcon,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "SO Pending",
      value: formatNumber(stats.pendingSOs),
      description: "Sales order aktif",
      icon: ShoppingCart,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "Transaksi Hari Ini",
      value: formatNumber(stats.todayTransactions),
      description: "Total pergerakan stok",
      icon: ArrowUpDown,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
    },
    {
      title: "Lokasi Aktif",
      value: formatNumber(stats.totalLocations),
      description: "Gudang & toko",
      icon: Warehouse,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Ringkasan inventori Anda hari ini</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex flex-col">
                <div className={`p-3 rounded-xl w-fit ${card.bg}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div className="min-w-0 mt-4">
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold mt-1 break-words">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Transaksi 6 Bulan Terakhir</CardTitle>
            <CardDescription>Perbandingan pembelian vs penjualan (dalam unit)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="purchases" fill="#3b82f6" name="Pembelian" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sales" fill="#10b981" name="Penjualan" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock by location */}
        <Card>
          <CardHeader>
            <CardTitle>Nilai Stok per Lokasi</CardTitle>
            <CardDescription>Distribusi inventori</CardDescription>
          </CardHeader>
          <CardContent>
            {stockByLocation.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={stockByLocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stockByLocation.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {stockByLocation.map((loc, index) => (
                    <div key={loc.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="truncate max-w-[120px]">{loc.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(loc.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Tidak ada data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Peringatan Stok Rendah
            </CardTitle>
            <CardDescription>Item yang perlu segera direorder</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {lowStockItems.map((il) => (
                  <div
                    key={il.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100"
                  >
                    <div>
                      <p className="font-medium text-sm">{il.item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {il.item.sku} • {il.location.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="warning">
                        {il.quantity} {il.item.unit?.abbreviation || "pcs"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Min: {il.item.reorderPoint}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 text-emerald-500" />
                <p className="text-sm">Semua stok dalam kondisi normal</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transaksi Terbaru</CardTitle>
            <CardDescription>10 pergerakan stok terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((tx) => {
                  const txType = TRANSACTION_TYPES[tx.type as keyof typeof TRANSACTION_TYPES];
                  return (
                    <div key={tx.id} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <ArrowUpDown className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tx.item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {txType?.label || tx.type} • {tx.user.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">
                          {tx.type === "SALE" || tx.type === "TRANSFER_OUT" ? "-" : "+"}
                          {formatNumber(tx.quantity)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                Belum ada transaksi
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { Warehouse, Search, AlertTriangle, Filter } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Location, ItemLocation } from "@/types";

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState("all");
  const [filter, setFilter] = useState("all");

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: () => api.get("/api/locations"),
  });

  const { data: inventory, isLoading } = useQuery<ItemLocation[]>({
    queryKey: ["inventory", locationId],
    queryFn: () =>
      api.get(
        `/api/inventory${locationId && locationId !== "all" ? `?locationId=${locationId}` : ""}`
      ),
  });

  const filteredInventory = inventory?.filter((il) => {
    const matchSearch =
      !search ||
      il.item?.name.toLowerCase().includes(search.toLowerCase()) ||
      il.item?.sku.toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      filter === "all" ||
      (filter === "low" && il.quantity <= (il.item?.reorderPoint || 0) && il.quantity > 0) ||
      (filter === "out" && il.quantity <= 0) ||
      (filter === "normal" && il.quantity > (il.item?.reorderPoint || 0));

    return matchSearch && matchFilter;
  });

  const totalValue =
    filteredInventory?.reduce(
      (sum, il) => sum + il.quantity * (il.item?.buyPrice || 0),
      0
    ) || 0;

  const getStockStatus = (qty: number, reorderPoint: number, minStock: number) => {
    if (qty <= 0) return { label: "Habis", variant: "destructive" as const };
    if (qty <= minStock) return { label: "Kritis", variant: "destructive" as const };
    if (qty <= reorderPoint) return { label: "Rendah", variant: "warning" as const };
    return { label: "Normal", variant: "success" as const };
  };

  const getStockPercent = (qty: number, reorderPoint: number) => {
    if (reorderPoint === 0) return 100;
    const percent = (qty / (reorderPoint * 3)) * 100;
    return Math.min(percent, 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventori</h1>
        <p className="text-muted-foreground">
          Pantau stok di semua lokasi secara real-time
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total Item</p>
            <p className="text-2xl font-bold">{formatNumber(filteredInventory?.length || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Nilai Stok</p>
            <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Stok Rendah</p>
            <p className="text-2xl font-bold text-amber-600">
              {formatNumber(
                filteredInventory?.filter(
                  (il) => il.quantity <= (il.item?.reorderPoint || 0) && il.quantity > 0
                ).length || 0
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Stok Habis</p>
            <p className="text-2xl font-bold text-red-600">
              {formatNumber(
                filteredInventory?.filter((il) => il.quantity <= 0).length || 0
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari barang..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Semua lokasi" />
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
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Stok Rendah</SelectItem>
                <SelectItem value="out">Habis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barang</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead>Level Stok</TableHead>
                  <TableHead className="text-right">Nilai Stok</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory?.map((il) => {
                  const status = getStockStatus(
                    il.quantity,
                    il.item?.reorderPoint || 0,
                    il.item?.minStock || 0
                  );
                  const percent = getStockPercent(
                    il.quantity,
                    il.item?.reorderPoint || 0
                  );
                  return (
                    <TableRow key={il.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{il.item?.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{il.item?.sku}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{il.location?.name}</Badge>
                      </TableCell>
                      <TableCell>
                        {il.item?.category?.name ? (
                          <Badge variant="secondary">{il.item.category.name}</Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-lg">{formatNumber(il.quantity)}</span>
                        <span className="text-muted-foreground text-sm ml-1">
                          {il.item?.unit?.abbreviation || "pcs"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="w-24">
                          <Progress
                            value={percent}
                            className={
                              status.variant === "destructive"
                                ? "[&>div]:bg-red-500"
                                : status.variant === "warning"
                                ? "[&>div]:bg-amber-500"
                                : "[&>div]:bg-emerald-500"
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(il.quantity * (il.item?.buyPrice || 0))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredInventory?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Warehouse className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Tidak ada data inventori</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

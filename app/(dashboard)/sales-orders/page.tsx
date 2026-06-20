"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, ShoppingCart, Search, Eye, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SO_STATUS } from "@/lib/constants";
import { SalesOrder, Customer, Location, Item } from "@/types";

interface SOResponse {
  orders: SalesOrder[];
}

interface SOItem {
  itemId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  notes: string;
  item?: Item;
}

function SalesOrdersContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const statusQuery = searchParams.get("status");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedSO, setSelectedSO] = useState<SalesOrder | null>(null);
  const [soItems, setSOItems] = useState<SOItem[]>([{ itemId: "", quantity: 1, unitPrice: 0, discount: 0, notes: "" }]);
  const [customerId, setCustomerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [itemSearch, setItemSearch] = useState("");

  const { data: soData, isLoading } = useQuery<SOResponse>({
    queryKey: ["sales-orders", statusFilter],
    queryFn: () =>
      api.get(`/api/sales-orders${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`),
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => api.get("/api/customers"),
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: () => api.get("/api/locations"),
  });

  const { data: itemsData } = useQuery<{ items: Item[] }>({
    queryKey: ["items", itemSearch],
    queryFn: () => api.get(`/api/items?search=${itemSearch}&limit=30`),
  });

  const createMutation = useMutation({
    mutationFn: (data: unknown) => api.post("/api/sales-orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Sales Order berhasil dibuat, stok diperbarui");
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (statusQuery) {
      setStatusFilter(statusQuery);
    }
  }, [statusQuery]);

  const resetForm = () => {
    setCustomerId("");
    setLocationId("");
    setNotes("");
    setDiscount(0);
    setTax(0);
    setSOItems([{ itemId: "", quantity: 1, unitPrice: 0, discount: 0, notes: "" }]);
  };

  const addSOItem = () => {
    setSOItems([...soItems, { itemId: "", quantity: 1, unitPrice: 0, discount: 0, notes: "" }]);
  };

  const removeSOItem = (index: number) => {
    setSOItems(soItems.filter((_, i) => i !== index));
  };

  const updateSOItem = (index: number, field: keyof SOItem, value: string | number) => {
    const updated = [...soItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "itemId" && itemsData) {
      const item = itemsData.items.find((i) => i.id === value);
      if (item) {
        updated[index].unitPrice = item.sellPrice;
        updated[index].item = item;
      }
    }
    setSOItems(updated);
  };

  const handleCreate = () => {
    if (!locationId) {
      toast.error("Pilih lokasi");
      return;
    }
    if (soItems.some((i) => !i.itemId)) {
      toast.error("Lengkapi semua item");
      return;
    }
    createMutation.mutate({
      customerId: customerId || undefined,
      locationId,
      notes,
      discount,
      tax,
      items: soItems,
    });
  };

  const getStatusBadge = (status: string) => {
    const s = SO_STATUS[status as keyof typeof SO_STATUS];
    if (!s) return <Badge>{status}</Badge>;
    return <Badge variant={s.variant as "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"}>{s.label}</Badge>;
  };

  const getSubtotal = (items: SOItem[]) =>
    items.reduce((sum, i) => sum + i.quantity * i.unitPrice * (1 - i.discount / 100), 0);

  const filteredSOs = soData?.orders.filter(
    (so) =>
      !search ||
      so.number.toLowerCase().includes(search.toLowerCase()) ||
      so.customer?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Order</h1>
          <p className="text-muted-foreground">Kelola penjualan dan pengeluaran stok</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          Buat SO
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor SO atau customer..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {Object.entries(SO_STATUS).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. SO</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Tgl Order</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSOs?.map((so) => {
                  const subtotal = so.items?.reduce(
                    (sum, i) => sum + i.quantity * i.unitPrice * (1 - i.discount / 100),
                    0
                  ) || 0;
                  return (
                    <TableRow key={so.id}>
                      <TableCell className="font-mono font-medium">{so.number}</TableCell>
                      <TableCell>{so.customer?.name || <span className="text-muted-foreground">-</span>}</TableCell>
                      <TableCell>{so.location?.name}</TableCell>
                      <TableCell>{formatDate(so.orderDate)}</TableCell>
                      <TableCell>{so.items?.length || 0} item</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(subtotal)}
                      </TableCell>
                      <TableCell>{getStatusBadge(so.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedSO(so);
                            setShowDetailDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredSOs?.length && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Belum ada Sales Order</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create SO Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Sales Order Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lokasi *</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih lokasi" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Item Barang *</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Cari barang..."
                    className="w-40 h-8 text-sm"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={addSOItem}>
                    <Plus className="h-3 w-3" />
                    Tambah
                  </Button>
                </div>
              </div>
              {soItems.map((soItem, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border bg-muted/30">
                  <div className="col-span-4">
                    <Select
                      value={soItem.itemId}
                      onValueChange={(val) => updateSOItem(index, "itemId", val)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Pilih barang" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemsData?.items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      className="h-8"
                      value={soItem.quantity}
                      onChange={(e) => updateSOItem(index, "quantity", parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Harga jual"
                      className="h-8"
                      value={soItem.unitPrice}
                      onChange={(e) => updateSOItem(index, "unitPrice", parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-medium">
                      {formatCurrency(soItem.quantity * soItem.unitPrice)}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeSOItem(index)}
                      disabled={soItems.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Subtotal: {formatCurrency(getSubtotal(soItems))}
                </p>
                <p className="font-bold">
                  Total: {formatCurrency(getSubtotal(soItems) * (1 - discount / 100) * (1 + tax / 100))}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Diskon (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Pajak (%)</Label>
                <Input
                  type="number"
                  min="0"
                  value={tax}
                  onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                placeholder="Catatan tambahan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Memproses..." : "Buat Sales Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail SO: {selectedSO?.number}</DialogTitle>
          </DialogHeader>
          {selectedSO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedSO.customer?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lokasi</p>
                  <p className="font-medium">{selectedSO.location?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tanggal</p>
                  <p className="font-medium">{formatDate(selectedSO.orderDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(selectedSO.status)}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barang</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Diskon</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedSO.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.item?.name}</p>
                        <p className="text-xs text-muted-foreground">{item.item?.sku}</p>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right">{item.discount}%</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.quantity * item.unitPrice * (1 - item.discount / 100))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">
                  Diskon: {selectedSO.discount}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Pajak: {selectedSO.tax}%
                </p>
                <p className="font-bold text-lg">
                  Total: {formatCurrency(
                    (selectedSO.items?.reduce(
                      (sum, i) => sum + i.quantity * i.unitPrice * (1 - i.discount / 100),
                      0
                    ) || 0) * (1 - selectedSO.discount / 100) * (1 + selectedSO.tax / 100)
                  )}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SalesOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Memuat sales orders...</div>}>
      <SalesOrdersContent />
    </Suspense>
  );
}

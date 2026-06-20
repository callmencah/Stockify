"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, TruckIcon, Search, Eye, CheckCircle, X } from "lucide-react";
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
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PO_STATUS } from "@/lib/constants";
import { PurchaseOrder, Supplier, Location, Item } from "@/types";
import { useSession } from "next-auth/react";

interface POResponse {
  orders: PurchaseOrder[];
  pagination: { total: number };
}

interface POItem {
  itemId: string;
  quantity: number;
  unitCost: number;
  notes: string;
  item?: Item;
}

export default function PurchaseOrdersPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const statusQuery = searchParams.get("status");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poItems, setPOItems] = useState<POItem[]>([{ itemId: "", quantity: 1, unitCost: 0, notes: "" }]);
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});
  const [itemSearch, setItemSearch] = useState("");

  const { data: poData, isLoading } = useQuery<POResponse>({
    queryKey: ["purchase-orders", statusFilter],
    queryFn: () =>
      api.get(
        `/api/purchase-orders${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`
      ),
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/api/suppliers"),
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
    mutationFn: (data: unknown) => api.post("/api/purchase-orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("Purchase Order berhasil dibuat");
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

  const receiveMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: unknown[] }) =>
      api.post(`/api/purchase-orders/${id}/receive`, { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Barang berhasil diterima, stok diperbarui");
      setShowReceiveDialog(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setSupplierId("");
    setLocationId("");
    setNotes("");
    setExpectedDate("");
    setPOItems([{ itemId: "", quantity: 1, unitCost: 0, notes: "" }]);
  };

  const addPOItem = () => {
    setPOItems([...poItems, { itemId: "", quantity: 1, unitCost: 0, notes: "" }]);
  };

  const removePOItem = (index: number) => {
    setPOItems(poItems.filter((_, i) => i !== index));
  };

  const updatePOItem = (index: number, field: keyof POItem, value: string | number) => {
    const updated = [...poItems];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-fill price from item data
    if (field === "itemId" && itemsData) {
      const item = itemsData.items.find((i) => i.id === value);
      if (item) {
        updated[index].unitCost = item.buyPrice;
        updated[index].item = item;
      }
    }
    setPOItems(updated);
  };

  const handleCreate = () => {
    if (!locationId) {
      toast.error("Pilih lokasi tujuan");
      return;
    }
    if (poItems.some((i) => !i.itemId)) {
      toast.error("Lengkapi semua item");
      return;
    }
    createMutation.mutate({
      supplierId: supplierId || undefined,
      locationId,
      notes,
      expectedDate: expectedDate || undefined,
      items: poItems,
    });
  };

  const handleReceive = () => {
    if (!selectedPO) return;
    const items = Object.entries(receivedQtys)
      .filter(([, qty]) => qty > 0)
      .map(([poItemId, receivedQty]) => ({ poItemId, receivedQty }));

    if (items.length === 0) {
      toast.error("Masukkan jumlah barang yang diterima");
      return;
    }
    receiveMutation.mutate({ id: selectedPO.id, items });
  };

  const getStatusBadge = (status: string) => {
    const s = PO_STATUS[status as keyof typeof PO_STATUS];
    if (!s) return <Badge>{status}</Badge>;
    return <Badge variant={s.variant as "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"}>{s.label}</Badge>;
  };

  const getTotalValue = (po: PurchaseOrder) =>
    po.items?.reduce((sum, item) => sum + item.quantity * item.unitCost, 0) || 0;

  const filteredPOs = poData?.orders.filter(
    (po) =>
      !search ||
      po.number.toLowerCase().includes(search.toLowerCase()) ||
      po.supplier?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Order</h1>
          <p className="text-muted-foreground">Kelola pemesanan barang ke supplier</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          Buat PO
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor PO atau supplier..."
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
                {Object.entries(PO_STATUS).map(([key, val]) => (
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
                  <TableHead>No. PO</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Tgl Order</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Total Nilai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs?.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono font-medium">{po.number}</TableCell>
                    <TableCell>{po.supplier?.name || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>{po.location?.name}</TableCell>
                    <TableCell>{formatDate(po.orderDate)}</TableCell>
                    <TableCell>{po.items?.length || 0} item</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(getTotalValue(po))}
                    </TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedPO(po);
                            setShowDetailDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(po.status === "SENT" || po.status === "PARTIAL" || po.status === "DRAFT") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-emerald-600"
                            onClick={() => {
                              setSelectedPO(po);
                              const initQtys: Record<string, number> = {};
                              po.items?.forEach((item) => {
                                initQtys[item.id] = item.quantity - item.receivedQty;
                              });
                              setReceivedQtys(initQtys);
                              setShowReceiveDialog(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredPOs?.length && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <TruckIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Belum ada Purchase Order</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create PO Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Purchase Order Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lokasi Tujuan *</Label>
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
              <Label>Tanggal Estimasi Tiba</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
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
                  <Button type="button" size="sm" variant="outline" onClick={addPOItem}>
                    <Plus className="h-3 w-3" />
                    Tambah
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {poItems.map((poItem, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border bg-muted/30">
                    <div className="col-span-5">
                      <Select
                        value={poItem.itemId}
                        onValueChange={(val) => updatePOItem(index, "itemId", val)}
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
                        value={poItem.quantity}
                        onChange={(e) => updatePOItem(index, "quantity", parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Harga satuan"
                        className="h-8"
                        value={poItem.unitCost}
                        onChange={(e) => updatePOItem(index, "unitCost", parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-medium">
                        {formatCurrency(poItem.quantity * poItem.unitCost)}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removePOItem(index)}
                        disabled={poItems.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-right text-sm font-bold">
                Total: {formatCurrency(poItems.reduce((sum, i) => sum + i.quantity * i.unitCost, 0))}
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
              {createMutation.isPending ? "Menyimpan..." : "Buat Purchase Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail PO: {selectedPO?.number}</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Supplier</p>
                  <p className="font-medium">{selectedPO.supplier?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lokasi</p>
                  <p className="font-medium">{selectedPO.location?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tanggal Order</p>
                  <p className="font-medium">{formatDate(selectedPO.orderDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(selectedPO.status)}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barang</TableHead>
                    <TableHead className="text-right">Order</TableHead>
                    <TableHead className="text-right">Diterima</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPO.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.item?.name}</p>
                        <p className="text-xs text-muted-foreground">{item.item?.sku}</p>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.receivedQty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.quantity * item.unitCost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right font-bold">
                Total: {formatCurrency(getTotalValue(selectedPO))}
              </div>
              {selectedPO.notes && (
                <div>
                  <p className="text-muted-foreground text-sm">Catatan</p>
                  <p className="text-sm">{selectedPO.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Terima Barang: {selectedPO?.number}</DialogTitle>
            <DialogDescription>
              Masukkan jumlah barang yang benar-benar diterima
            </DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-3">
              {selectedPO.items?.map((item) => {
                const remaining = item.quantity - item.receivedQty;
                return (
                  <div key={item.id} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{item.item?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Sisa: {remaining} dari {item.quantity}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        max={remaining}
                        className="w-24"
                        value={receivedQtys[item.id] ?? remaining}
                        onChange={(e) =>
                          setReceivedQtys((prev) => ({
                            ...prev,
                            [item.id]: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={handleReceive}
              disabled={receiveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle className="h-4 w-4" />
              {receiveMutation.isPending ? "Memproses..." : "Konfirmasi Penerimaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

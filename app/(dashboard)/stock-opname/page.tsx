"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, ClipboardList, Eye, CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { OPNAME_STATUS } from "@/lib/constants";
import { StockOpname, Location } from "@/types";

export default function StockOpnamePage() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCountDialog, setShowCountDialog] = useState(false);
  const [selectedOpname, setSelectedOpname] = useState<StockOpname | null>(null);
  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});

  const { data: opnames, isLoading } = useQuery<StockOpname[]>({
    queryKey: ["stock-opname"],
    queryFn: () => api.get("/api/stock-opname"),
  });

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: () => api.get("/api/locations"),
  });

  const { data: opnameDetail, refetch: refetchDetail } = useQuery<StockOpname>({
    queryKey: ["stock-opname", selectedOpname?.id],
    queryFn: () => api.get(`/api/stock-opname/${selectedOpname?.id}`),
    enabled: !!selectedOpname?.id && showCountDialog,
  });

  const createMutation = useMutation({
    mutationFn: (data: { locationId: string; notes: string }) =>
      api.post("/api/stock-opname", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-opname"] });
      toast.success("Stock opname berhasil dimulai");
      setShowCreateDialog(false);
      setLocationId("");
      setNotes("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCountMutation = useMutation({
    mutationFn: ({
      id,
      items,
    }: {
      id: string;
      items: Array<{ id: string; physicalQty: number }>;
    }) => api.put(`/api/stock-opname/${id}`, { action: "update_count", items }),
    onSuccess: () => {
      refetchDetail();
      toast.success("Hitungan diperbarui");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      api.put(`/api/stock-opname/${id}`, { action: "complete" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-opname"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Stock opname selesai, stok telah disesuaikan");
      setShowCountDialog(false);
      setSelectedOpname(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getStatusBadge = (status: string) => {
    const s = OPNAME_STATUS[status as keyof typeof OPNAME_STATUS];
    if (!s) return <Badge>{status}</Badge>;
    return <Badge variant={s.variant as "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"}>{s.label}</Badge>;
  };

  const handleSaveCount = () => {
    if (!opnameDetail || !selectedOpname) return;
    const items = opnameDetail.items?.map((item) => ({
      id: item.id,
      physicalQty: physicalCounts[item.id] ?? item.physicalQty ?? item.systemQty,
    })) || [];
    updateCountMutation.mutate({ id: selectedOpname.id, items });
  };

  const handleComplete = () => {
    if (!selectedOpname) return;
    // Save counts first, then complete
    handleSaveCount();
    setTimeout(() => {
      completeMutation.mutate(selectedOpname.id);
    }, 500);
  };

  const openCountDialog = (opname: StockOpname) => {
    setSelectedOpname(opname);
    setShowCountDialog(true);
    // Initialize physical counts from existing data
    const initCounts: Record<string, number> = {};
    opname.items?.forEach((item) => {
      initCounts[item.id] = item.physicalQty ?? item.systemQty;
    });
    setPhysicalCounts(initCounts);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Opname</h1>
          <p className="text-muted-foreground">
            Hitung dan sesuaikan stok fisik dengan sistem
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          Mulai Opname
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Opname</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Tgl Mulai</TableHead>
                  <TableHead>Tgl Selesai</TableHead>
                  <TableHead>Total Item</TableHead>
                  <TableHead>Selisih</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opnames?.map((opname) => {
                  const differences = opname.items?.filter(
                    (i) => i.physicalQty !== null && i.physicalQty !== i.systemQty
                  ).length || 0;
                  return (
                    <TableRow key={opname.id}>
                      <TableCell className="font-mono font-medium">{opname.number}</TableCell>
                      <TableCell>{opname.location?.name}</TableCell>
                      <TableCell>{formatDate(opname.startDate)}</TableCell>
                      <TableCell>
                        {opname.endDate ? formatDate(opname.endDate) : "-"}
                      </TableCell>
                      <TableCell>{opname.items?.length || 0}</TableCell>
                      <TableCell>
                        {differences > 0 ? (
                          <Badge variant="warning">{differences} item</Badge>
                        ) : (
                          <Badge variant="success">0</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(opname.status)}</TableCell>
                      <TableCell>
                        {opname.status === "IN_PROGRESS" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCountDialog(opname)}
                          >
                            <ClipboardList className="h-4 w-4 mr-1" />
                            Input
                          </Button>
                        )}
                        {opname.status === "COMPLETED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCountDialog(opname)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Detail
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!opnames?.length && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Belum ada stock opname</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mulai Stock Opname</DialogTitle>
            <DialogDescription>
              Sistem akan otomatis mengambil daftar barang di lokasi yang dipilih
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lokasi *</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih lokasi" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                placeholder="Catatan opname..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                if (!locationId) {
                  toast.error("Pilih lokasi terlebih dahulu");
                  return;
                }
                createMutation.mutate({ locationId, notes });
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Memproses..." : "Mulai Opname"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Count Dialog */}
      <Dialog open={showCountDialog} onOpenChange={setShowCountDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedOpname?.status === "COMPLETED" ? "Detail" : "Input Hitungan"} - {selectedOpname?.number}
            </DialogTitle>
            <DialogDescription>
              Lokasi: {selectedOpname?.location?.name}
            </DialogDescription>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barang</TableHead>
                <TableHead className="text-right">Stok Sistem</TableHead>
                <TableHead className="text-right">Stok Fisik</TableHead>
                <TableHead className="text-right">Selisih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(opnameDetail?.items || selectedOpname?.items)?.map((item) => {
                const physQty = physicalCounts[item.id] ?? item.physicalQty ?? item.systemQty;
                const diff = physQty - item.systemQty;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.item?.name}</p>
                      <p className="text-xs text-muted-foreground">{item.item?.sku}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.systemQty)} {item.item?.unit?.abbreviation}
                    </TableCell>
                    <TableCell className="text-right">
                      {selectedOpname?.status === "COMPLETED" ? (
                        <span>{formatNumber(item.physicalQty || 0)}</span>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          className="w-24 ml-auto"
                          value={physQty}
                          onChange={(e) =>
                            setPhysicalCounts((prev) => ({
                              ...prev,
                              [item.id]: parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          diff > 0
                            ? "text-emerald-600 font-medium"
                            : diff < 0
                            ? "text-red-600 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {diff > 0 ? "+" : ""}{formatNumber(diff)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {selectedOpname?.status === "IN_PROGRESS" && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleSaveCount} disabled={updateCountMutation.isPending}>
                Simpan Hitungan
              </Button>
              <Button
                onClick={handleComplete}
                disabled={completeMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="h-4 w-4" />
                {completeMutation.isPending ? "Memproses..." : "Selesaikan & Sesuaikan Stok"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

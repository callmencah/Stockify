"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Package,
  Edit,
  ToggleLeft,
  QrCode,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Item, Category, Unit } from "@/types";

const itemSchema = z.object({
  sku: z.string().min(1, "SKU wajib diisi"),
  barcode: z.string().optional(),
  name: z.string().min(1, "Nama wajib diisi"),
  description: z.string().optional(),
  buyPrice: z.number().min(0, "Harga beli minimal 0"),
  sellPrice: z.number().min(0, "Harga jual minimal 0"),
  minStock: z.number().min(0).default(0),
  reorderPoint: z.number().min(0).default(0),
  categoryId: z.string().optional(),
  unitId: z.string().optional(),
  trackSerial: z.boolean().default(false),
  trackBatch: z.boolean().default(false),
});

type ItemForm = z.infer<typeof itemSchema>;

interface ItemsResponse {
  items: Item[];
  pagination: { total: number; totalPages: number };
}

export default function ItemsPage() {
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<ItemsResponse>({
    queryKey: ["items", search],
    queryFn: () => api.get(`/api/items?search=${search}&limit=50`),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/api/categories"),
  });

  const { data: units } = useQuery<Unit[]>({
    queryKey: ["units"],
    queryFn: () => api.get("/api/units"),
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      buyPrice: 0,
      sellPrice: 0,
      minStock: 0,
      reorderPoint: 0,
      trackSerial: false,
      trackBatch: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ItemForm) => api.post("/api/items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Barang berhasil ditambahkan");
      setShowDialog(false);
      reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ItemForm }) =>
      api.put(`/api/items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Barang berhasil diperbarui");
      setShowDialog(false);
      setEditingItem(null);
      reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/api/items/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Status barang diperbarui");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditingItem(null);
    reset({
      buyPrice: 0,
      sellPrice: 0,
      minStock: 0,
      reorderPoint: 0,
      trackSerial: false,
      trackBatch: false,
    });
    setShowDialog(true);
  };

  const openEdit = (item: Item) => {
    setEditingItem(item);
    reset({
      sku: item.sku,
      barcode: item.barcode || "",
      name: item.name,
      description: item.description || "",
      buyPrice: item.buyPrice,
      sellPrice: item.sellPrice,
      minStock: item.minStock,
      reorderPoint: item.reorderPoint,
      categoryId: item.categoryId || undefined,
      unitId: item.unitId || undefined,
      trackSerial: item.trackSerial,
      trackBatch: item.trackBatch,
    });
    setShowDialog(true);
  };

  const onSubmit = (formData: ItemForm) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Master Barang</h1>
          <p className="text-muted-foreground">
            Kelola data barang dan produk Anda
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tambah Barang
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, SKU, atau barcode..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
                  <TableHead>SKU / Barcode</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Harga Beli</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead className="text-right">Min. Stok</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-mono text-sm font-medium">{item.sku}</p>
                        {item.barcode && (
                          <p className="text-xs text-muted-foreground">{item.barcode}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.category ? (
                        <Badge variant="secondary">{item.category.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.unit?.abbreviation || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.buyPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.sellPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.reorderPoint)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? "success" : "secondary"}>
                        {item.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(item)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              toggleMutation.mutate({
                                id: item.id,
                                isActive: !item.isActive,
                              })
                            }
                          >
                            <ToggleLeft className="mr-2 h-4 w-4" />
                            {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">
                        {search ? "Tidak ada barang yang cocok" : "Belum ada barang"}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) { setEditingItem(null); reset(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Barang" : "Tambah Barang Baru"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input
                  placeholder="ELEC-LAP-001"
                  {...register("sku")}
                />
                {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Barcode</Label>
                <Input placeholder="8901234567890" {...register("barcode")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nama Barang *</Label>
              <Input placeholder="Laptop Gaming ProX 15" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea placeholder="Deskripsi barang..." {...register("description")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Controller
                  name="unitId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih satuan" />
                      </SelectTrigger>
                      <SelectContent>
                        {units?.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name} ({unit.abbreviation})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Harga Beli (Rp) *</Label>
                <Input
                  type="number"
                  min="0"
                  {...register("buyPrice", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Harga Jual (Rp) *</Label>
                <Input
                  type="number"
                  min="0"
                  {...register("sellPrice", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stok Minimum</Label>
                <Input
                  type="number"
                  min="0"
                  {...register("minStock", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reorder Point</Label>
                <Input
                  type="number"
                  min="0"
                  {...register("reorderPoint", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Controller
                  name="trackSerial"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label>Tracking Serial Number</Label>
              </div>
              <div className="flex items-center gap-2">
                <Controller
                  name="trackBatch"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label>Tracking Batch/Lot</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowDialog(false); setEditingItem(null); reset(); }}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : editingItem ? "Perbarui" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { MapPin, Plus, Edit, Building2, Store, Truck } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Location } from "@/types";
import { LOCATION_TYPES } from "@/lib/constants";
import { useForm, Controller } from "react-hook-form";

interface LocationForm {
  code: string;
  name: string;
  address: string;
  type: string;
}

const locationIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  WAREHOUSE: Building2,
  STORE: Store,
  SUPPLIER: Truck,
  CUSTOMER: MapPin,
};

export default function LocationsPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const queryClient = useQueryClient();

  const { data: locations, isLoading } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: () => api.get("/api/locations"),
  });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<LocationForm>({
    defaultValues: { type: "WAREHOUSE" },
  });

  const createMutation = useMutation({
    mutationFn: (data: LocationForm) => api.post("/api/locations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Lokasi berhasil ditambahkan");
      setShowDialog(false);
      reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LocationForm> }) =>
      api.put(`/api/locations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Lokasi berhasil diperbarui");
      setShowDialog(false);
      setEditingLocation(null);
      reset();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditingLocation(null);
    reset({ type: "WAREHOUSE" });
    setShowDialog(true);
  };

  const openEdit = (loc: Location) => {
    setEditingLocation(loc);
    reset({
      code: loc.code,
      name: loc.name,
      address: loc.address || "",
      type: loc.type,
    });
    setShowDialog(true);
  };

  const onSubmit = (data: LocationForm) => {
    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lokasi & Gudang</h1>
          <p className="text-muted-foreground">Kelola gudang dan toko Anda</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tambah Lokasi
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations?.map((loc) => {
            const Icon = locationIcons[loc.type] || MapPin;
            const typeInfo = LOCATION_TYPES[loc.type as keyof typeof LOCATION_TYPES];
            return (
              <Card key={loc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold">{loc.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">{loc.code}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(loc)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{typeInfo?.label || loc.type}</Badge>
                      <Badge variant={loc.isActive ? "success" : "secondary"}>
                        {loc.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                    {loc.address && (
                      <p className="text-sm text-muted-foreground">{loc.address}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!locations?.length && (
            <div className="col-span-3 text-center py-12 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3" />
              <p>Belum ada lokasi terdaftar</p>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) { setEditingLocation(null); reset(); }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Edit Lokasi" : "Tambah Lokasi Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Kode Lokasi *</Label>
              <Input placeholder="GDG-01" {...register("code", { required: true })} disabled={!!editingLocation} />
            </div>
            <div className="space-y-2">
              <Label>Nama Lokasi *</Label>
              <Input placeholder="Gudang Utama" {...register("name", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LOCATION_TYPES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {val.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Textarea placeholder="Alamat lengkap..." {...register("address")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); reset(); }}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : editingLocation ? "Perbarui" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

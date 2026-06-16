"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit, Building2, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Supplier } from "@/types";

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ["suppliers", search],
    queryFn: () => api.get(`/api/suppliers?search=${search}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: unknown) => api.post("/api/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier berhasil ditambahkan");
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      api.put(`/api/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier berhasil diperbarui");
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditingSupplier(null);
    setCode("");
    setName("");
    setContact("");
    setEmail("");
    setPhone("");
    setAddress("");
  };

  const openCreate = () => {
    setEditingSupplier(null);
    closeDialog();
    setShowDialog(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setCode(s.code);
    setName(s.name);
    setContact(s.contact || "");
    setEmail(s.email || "");
    setPhone(s.phone || "");
    setAddress(s.address || "");
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!code || !name) {
      toast.error("Kode dan nama wajib diisi");
      return;
    }
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: { name, contact, email, phone, address } });
    } else {
      createMutation.mutate({ code, name, contact, email, phone, address });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Supplier</h1>
          <p className="text-muted-foreground">Kelola data supplier Anda</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tambah Supplier
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari supplier..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono font-medium">{s.code}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.contact || "-"}</TableCell>
                  <TableCell>{s.email || "-"}</TableCell>
                  <TableCell>{s.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? "success" : "secondary"}>
                      {s.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!suppliers?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Belum ada supplier</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); setShowDialog(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Edit Supplier" : "Tambah Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Kode *</Label>
                <Input placeholder="SUP-001" value={code} onChange={(e) => setCode(e.target.value)} disabled={!!editingSupplier} />
              </div>
              <div className="space-y-1">
                <Label>Nama *</Label>
                <Input placeholder="PT. Supplier" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Kontak</Label>
                <Input placeholder="Nama kontak" value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" placeholder="email@supplier.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Telepon</Label>
              <Input placeholder="021-123456" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Alamat</Label>
              <Textarea placeholder="Alamat lengkap" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Menyimpan..." : editingSupplier ? "Perbarui" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

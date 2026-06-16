"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Edit, UserCircle, Search } from "lucide-react";
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
import { Customer } from "@/types";

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["customers", search],
    queryFn: () => api.get(`/api/customers?search=${search}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: unknown) => api.post("/api/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer berhasil ditambahkan");
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      api.put(`/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer berhasil diperbarui");
      closeDialog();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditingCustomer(null);
    setCode(""); setName(""); setContact(""); setEmail(""); setPhone(""); setAddress("");
  };

  const openCreate = () => { closeDialog(); setShowDialog(true); };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setCode(c.code); setName(c.name);
    setContact(c.contact || ""); setEmail(c.email || "");
    setPhone(c.phone || ""); setAddress(c.address || "");
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!code || !name) { toast.error("Kode dan nama wajib diisi"); return; }
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: { name, contact, email, phone, address } });
    } else {
      createMutation.mutate({ code, name, contact, email, phone, address });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer</h1>
          <p className="text-muted-foreground">Kelola data pelanggan Anda</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Tambah Customer</Button>
      </div>
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari customer..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead><TableHead>Nama</TableHead>
                <TableHead>Kontak</TableHead><TableHead>Email</TableHead>
                <TableHead>Telepon</TableHead><TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-medium">{c.code}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.contact || "-"}</TableCell>
                  <TableCell>{c.email || "-"}</TableCell>
                  <TableCell>{c.phone || "-"}</TableCell>
                  <TableCell><Badge variant={c.isActive ? "success" : "secondary"}>{c.isActive ? "Aktif" : "Nonaktif"}</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
              {!customers?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Belum ada customer</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); setShowDialog(open); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCustomer ? "Edit Customer" : "Tambah Customer"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Kode *</Label><Input placeholder="CUS-001" value={code} onChange={(e) => setCode(e.target.value)} disabled={!!editingCustomer} /></div>
              <div className="space-y-1"><Label>Nama *</Label><Input placeholder="PT. Customer" value={name} onChange={(e) => setName(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Kontak</Label><Input value={contact} onChange={(e) => setContact(e.target.value)} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Telepon</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="space-y-1"><Label>Alamat</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isPending}>{isPending ? "Menyimpan..." : editingCustomer ? "Perbarui" : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

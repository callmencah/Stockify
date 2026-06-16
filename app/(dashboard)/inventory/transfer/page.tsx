"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeftRight, Plus, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatDateTime } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Location, Item, StockTransaction } from "@/types";

interface TransactionsResponse {
  transactions: StockTransaction[];
}

export default function TransferPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [itemSearch, setItemSearch] = useState("");

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: () => api.get("/api/locations"),
  });

  const { data: itemsData } = useQuery<{ items: Item[] }>({
    queryKey: ["items", itemSearch],
    queryFn: () => api.get(`/api/items?search=${itemSearch}&limit=20`),
  });

  const { data: txData } = useQuery<TransactionsResponse>({
    queryKey: ["transactions", "transfer"],
    queryFn: () => api.get("/api/inventory/transactions?type=TRANSFER_OUT&limit=20"),
  });

  const transferMutation = useMutation({
    mutationFn: (data: {
      itemId: string;
      fromLocationId: string;
      toLocationId: string;
      quantity: number;
      notes: string;
    }) => api.post("/api/inventory/transfer", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transfer stok berhasil");
      setItemId("");
      setQuantity("");
      setNotes("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleTransfer = () => {
    if (!fromLocationId || !toLocationId || !itemId || !quantity) {
      toast.error("Lengkapi semua field yang diperlukan");
      return;
    }
    if (fromLocationId === toLocationId) {
      toast.error("Lokasi asal dan tujuan tidak boleh sama");
      return;
    }
    transferMutation.mutate({
      itemId,
      fromLocationId,
      toLocationId,
      quantity: parseFloat(quantity),
      notes,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transfer Stok</h1>
        <p className="text-muted-foreground">
          Pindahkan barang antar gudang atau toko
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Form Transfer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Dari Lokasi *</Label>
              <Select value={fromLocationId} onValueChange={setFromLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih lokasi asal" />
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
              <Label>Ke Lokasi *</Label>
              <Select value={toLocationId} onValueChange={setToLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih lokasi tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    ?.filter((loc) => loc.id !== fromLocationId)
                    .map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Barang *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari barang..."
                    className="pl-9"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                  />
                </div>
              </div>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Jumlah *</Label>
              <Input
                type="number"
                min="1"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                placeholder="Alasan transfer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button
              onClick={handleTransfer}
              disabled={transferMutation.isPending}
              className="w-full"
            >
              <ArrowLeftRight className="h-4 w-4" />
              {transferMutation.isPending ? "Memproses..." : "Transfer Sekarang"}
            </Button>
          </CardContent>
        </Card>

        {/* Recent transfers */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Transfer</CardTitle>
            <CardDescription>Transfer stok terbaru</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {txData?.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{tx.item?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.fromLocation?.name} → {tx.toLocation?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ref: {tx.reference} • {formatDateTime(tx.createdAt)}
                    </p>
                  </div>
                  <Badge variant="info">{formatNumber(tx.quantity)}</Badge>
                </div>
              ))}
              {!txData?.transactions.length && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Belum ada riwayat transfer
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

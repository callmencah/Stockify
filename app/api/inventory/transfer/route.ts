import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { itemId, fromLocationId, toLocationId, quantity, notes } = body;

  if (!itemId || !fromLocationId || !toLocationId || !quantity) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  if (fromLocationId === toLocationId) {
    return NextResponse.json({ error: "Lokasi asal dan tujuan tidak boleh sama" }, { status: 400 });
  }

  if (quantity <= 0) {
    return NextResponse.json({ error: "Jumlah harus lebih dari 0" }, { status: 400 });
  }

  // Check source stock
  const sourceStock = await prisma.itemLocation.findUnique({
    where: { itemId_locationId: { itemId, locationId: fromLocationId } },
  });

  if (!sourceStock || sourceStock.quantity < quantity) {
    return NextResponse.json({ error: "Stok tidak mencukupi" }, { status: 400 });
  }

  const ref = `TRF-${Date.now()}`;

  await prisma.$transaction([
    // Decrease source
    prisma.itemLocation.update({
      where: { itemId_locationId: { itemId, locationId: fromLocationId } },
      data: { quantity: { decrement: quantity } },
    }),
    // Increase destination
    prisma.itemLocation.upsert({
      where: { itemId_locationId: { itemId, locationId: toLocationId } },
      update: { quantity: { increment: quantity } },
      create: { itemId, locationId: toLocationId, quantity },
    }),
    // Log transactions
    prisma.stockTransaction.create({
      data: {
        type: "TRANSFER_OUT",
        itemId,
        fromLocationId,
        toLocationId,
        quantity,
        reference: ref,
        notes,
        userId: session.user.id,
      },
    }),
    prisma.stockTransaction.create({
      data: {
        type: "TRANSFER_IN",
        itemId,
        fromLocationId,
        toLocationId,
        quantity,
        reference: ref,
        notes,
        userId: session.user.id,
      },
    }),
  ]);

  return NextResponse.json({ message: "Transfer berhasil", reference: ref });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { items } = body; // [{ poItemId, receivedQty }]

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!po) return NextResponse.json({ error: "PO tidak ditemukan" }, { status: 404 });
  if (po.status === "CANCELLED") {
    return NextResponse.json({ error: "PO sudah dibatalkan" }, { status: 400 });
  }

  const operations = [];

  for (const receivedItem of items) {
    const poItem = po.items.find((i) => i.id === receivedItem.poItemId);
    if (!poItem) continue;

    const qty = receivedItem.receivedQty;
    if (qty <= 0) continue;

    // Update PO item received qty
    operations.push(
      prisma.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: { receivedQty: { increment: qty } },
      })
    );

    // Update stock
    operations.push(
      prisma.itemLocation.upsert({
        where: {
          itemId_locationId: { itemId: poItem.itemId, locationId: po.locationId },
        },
        update: { quantity: { increment: qty } },
        create: { itemId: poItem.itemId, locationId: po.locationId, quantity: qty },
      })
    );

    // Record transaction
    operations.push(
      prisma.stockTransaction.create({
        data: {
          type: "PURCHASE",
          itemId: poItem.itemId,
          toLocationId: po.locationId,
          quantity: qty,
          unitCost: poItem.unitCost,
          reference: po.number,
          userId: session.user.id,
          notes: `Penerimaan dari PO ${po.number}`,
        },
      })
    );
  }

  await prisma.$transaction(operations);

  // Check if fully received
  const updatedPO = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });

  const allReceived = updatedPO!.items.every(
    (item) => item.receivedQty >= item.quantity
  );
  const anyReceived = updatedPO!.items.some((item) => item.receivedQty > 0);

  await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: allReceived ? "RECEIVED" : anyReceived ? "PARTIAL" : po.status,
    },
  });

  // Check for low stock alerts
  for (const receivedItem of items) {
    const poItem = po.items.find((i) => i.id === receivedItem.poItemId);
    if (!poItem) continue;

    const itemLocation = await prisma.itemLocation.findUnique({
      where: {
        itemId_locationId: { itemId: poItem.itemId, locationId: po.locationId },
      },
      include: { item: true },
    });

    if (itemLocation && itemLocation.quantity <= itemLocation.item.reorderPoint) {
      const adminUsers = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "MANAGER"] }, isActive: true },
      });

      await prisma.notification.createMany({
        data: adminUsers.map((u) => ({
          userId: u.id,
          type: "LOW_STOCK",
          title: "Stok Rendah",
          message: `${itemLocation.item.name} stok rendah: ${itemLocation.quantity} ${itemLocation.item.name}`,
          entityId: poItem.itemId,
        })),
      });
    }
  }

  return NextResponse.json({ message: "Barang berhasil diterima" });
}

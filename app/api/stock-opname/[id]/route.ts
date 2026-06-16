import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const opname = await prisma.stockOpname.findUnique({
    where: { id },
    include: {
      location: true,
      user: { select: { id: true, name: true } },
      items: { include: { item: { include: { unit: true, category: true } } } },
    },
  });

  if (!opname) return NextResponse.json({ error: "Opname tidak ditemukan" }, { status: 404 });
  return NextResponse.json(opname);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  if (body.action === "update_count") {
    // Update physical counts for items
    const { items } = body;
    const opname = await prisma.stockOpname.findUnique({
      where: { id },
      include: { items: true },
    });

    const updateWithDiff = items.map((item: { id: string; physicalQty: number; notes?: string }) => {
      const opItem = opname?.items.find((i) => i.id === item.id);
      return prisma.stockOpnameItem.update({
        where: { id: item.id },
        data: {
          physicalQty: item.physicalQty,
          difference: item.physicalQty - (opItem?.systemQty || 0),
          notes: item.notes,
        },
      });
    });

    await prisma.$transaction(updateWithDiff);
    return NextResponse.json({ message: "Hitungan diperbarui" });
  }

  if (body.action === "complete") {
    // Apply adjustments to stock
    const opname = await prisma.stockOpname.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!opname) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const adjustments = opname.items
      .filter((item) => item.physicalQty !== null && item.physicalQty !== item.systemQty)
      .map((item) => {
        const diff = (item.physicalQty || 0) - item.systemQty;
        return prisma.$transaction([
          prisma.itemLocation.update({
            where: {
              itemId_locationId: {
                itemId: item.itemId,
                locationId: opname.locationId,
              },
            },
            data: { quantity: item.physicalQty || 0 },
          }),
          prisma.stockTransaction.create({
            data: {
              type: "OPNAME",
              itemId: item.itemId,
              toLocationId: diff > 0 ? opname.locationId : undefined,
              fromLocationId: diff < 0 ? opname.locationId : undefined,
              quantity: Math.abs(diff),
              reference: opname.number,
              userId: session.user.id,
              notes: `Stock opname adjustment: ${diff > 0 ? "+" : ""}${diff}`,
            },
          }),
        ]);
      });

    await Promise.all(adjustments);

    await prisma.stockOpname.update({
      where: { id },
      data: { status: "COMPLETED", endDate: new Date() },
    });

    return NextResponse.json({ message: "Stock opname selesai" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

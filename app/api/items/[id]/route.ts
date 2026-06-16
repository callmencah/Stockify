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
  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      category: true,
      unit: true,
      itemLocations: { include: { location: true } },
      batches: { orderBy: { createdAt: "desc" } },
      serialNumbers: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!item) return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  try {
    const oldItem = await prisma.item.findUnique({ where: { id } });
    const item = await prisma.item.update({
      where: { id },
      data: {
        sku: body.sku,
        barcode: body.barcode,
        name: body.name,
        description: body.description,
        buyPrice: body.buyPrice,
        sellPrice: body.sellPrice,
        minStock: body.minStock,
        reorderPoint: body.reorderPoint,
        categoryId: body.categoryId,
        unitId: body.unitId,
        isActive: body.isActive,
        trackSerial: body.trackSerial,
        trackBatch: body.trackBatch,
      },
      include: { category: true, unit: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "Item",
        entityId: id,
        oldValue: JSON.stringify(oldItem),
        newValue: JSON.stringify(body),
      },
    });

    return NextResponse.json(item);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "SKU atau barcode sudah digunakan" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal update item" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await prisma.item.update({ where: { id }, data: { isActive: false } });
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entity: "Item",
        entityId: id,
      },
    });
    return NextResponse.json({ message: "Item dinonaktifkan" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus item" }, { status: 500 });
  }
}

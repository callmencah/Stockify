import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const supplierId = searchParams.get("supplierId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: {
        ...(status && { status }),
        ...(supplierId && { supplierId }),
      },
      include: {
        supplier: true,
        location: true,
        user: { select: { id: true, name: true } },
        items: { include: { item: { include: { unit: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchaseOrder.count({
      where: {
        ...(status && { status }),
        ...(supplierId && { supplierId }),
      },
    }),
  ]);

  return NextResponse.json({
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { supplierId, locationId, expectedDate, notes, items } = body;

  if (!locationId || !items || items.length === 0) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  const number = generateOrderNumber("PO");

  const po = await prisma.purchaseOrder.create({
    data: {
      number,
      supplierId,
      locationId,
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      notes,
      userId: session.user.id,
      items: {
        create: items.map((item: { itemId: string; quantity: number; unitCost: number; notes?: string }) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          notes: item.notes,
        })),
      },
    },
    include: {
      supplier: true,
      location: true,
      items: { include: { item: true } },
    },
  });

  return NextResponse.json(po, { status: 201 });
}

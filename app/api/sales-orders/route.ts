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
  const customerId = searchParams.get("customerId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where: {
        ...(status && { status }),
        ...(customerId && { customerId }),
      },
      include: {
        customer: true,
        location: true,
        user: { select: { id: true, name: true } },
        items: { include: { item: { include: { unit: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.salesOrder.count({
      where: {
        ...(status && { status }),
        ...(customerId && { customerId }),
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
  const { customerId, locationId, notes, discount, tax, items } = body;

  if (!locationId || !items || items.length === 0) {
    return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
  }

  // Check stock availability
  for (const item of items) {
    const stock = await prisma.itemLocation.findUnique({
      where: {
        itemId_locationId: { itemId: item.itemId, locationId },
      },
    });
    if (!stock || stock.quantity < item.quantity) {
      const itemData = await prisma.item.findUnique({ where: { id: item.itemId } });
      return NextResponse.json(
        { error: `Stok ${itemData?.name || item.itemId} tidak mencukupi` },
        { status: 400 }
      );
    }
  }

  const number = generateOrderNumber("SO");

  const so = await prisma.salesOrder.create({
    data: {
      number,
      customerId,
      locationId,
      notes,
      discount: discount || 0,
      tax: tax || 0,
      userId: session.user.id,
      status: "CONFIRMED",
      items: {
        create: items.map((item: { itemId: string; quantity: number; unitPrice: number; discount?: number; notes?: string }) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          notes: item.notes,
        })),
      },
    },
    include: {
      customer: true,
      location: true,
      items: { include: { item: true } },
    },
  });

  // Deduct stock
  const stockOps = items.map((item: { itemId: string; quantity: number; unitPrice: number }) =>
    prisma.$transaction([
      prisma.itemLocation.update({
        where: { itemId_locationId: { itemId: item.itemId, locationId } },
        data: { quantity: { decrement: item.quantity } },
      }),
      prisma.stockTransaction.create({
        data: {
          type: "SALE",
          itemId: item.itemId,
          fromLocationId: locationId,
          quantity: item.quantity,
          unitCost: item.unitPrice,
          reference: number,
          userId: session.user.id,
          notes: `Penjualan SO ${number}`,
        },
      }),
    ])
  );

  await Promise.all(stockOps);

  return NextResponse.json(so, { status: 201 });
}

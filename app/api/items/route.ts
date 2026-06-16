import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const itemSchema = z.object({
  sku: z.string().min(1),
  barcode: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  buyPrice: z.number().min(0),
  sellPrice: z.number().min(0),
  minStock: z.number().min(0).default(0),
  reorderPoint: z.number().min(0).default(0),
  categoryId: z.string().optional(),
  unitId: z.string().optional(),
  trackSerial: z.boolean().default(false),
  trackBatch: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId");
  const isActive = searchParams.get("isActive");
  const lowStock = searchParams.get("lowStock") === "true";
  const locationId = searchParams.get("locationId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    ...(search && {
      OR: [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ],
    }),
    ...(categoryId && { categoryId }),
    ...(isActive !== null && isActive !== undefined && { isActive: isActive === "true" }),
  };

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      include: {
        category: true,
        unit: true,
        itemLocations: {
          include: { location: true },
          ...(locationId && { where: { locationId } }),
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.item.count({ where }),
  ]);

  // Filter low stock if requested
  let filteredItems = items;
  if (lowStock) {
    filteredItems = items.filter((item) => {
      const totalQty = item.itemLocations.reduce((sum, il) => sum + il.quantity, 0);
      return totalQty <= item.reorderPoint;
    });
  }

  return NextResponse.json({
    items: filteredItems,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const item = await prisma.item.create({
      data: parsed.data,
      include: { category: true, unit: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "Item",
        entityId: item.id,
        newValue: JSON.stringify(parsed.data),
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "SKU atau barcode sudah digunakan" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal membuat item" }, { status: 500 });
  }
}

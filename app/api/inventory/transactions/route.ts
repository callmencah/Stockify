import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  const locationId = searchParams.get("locationId");
  const type = searchParams.get("type");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.stockTransaction.findMany({
      where: {
        ...(itemId && { itemId }),
        ...(locationId && {
          OR: [{ fromLocationId: locationId }, { toLocationId: locationId }],
        }),
        ...(type && { type }),
      },
      include: {
        item: { include: { unit: true } },
        fromLocation: true,
        toLocation: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.stockTransaction.count({
      where: {
        ...(itemId && { itemId }),
        ...(locationId && {
          OR: [{ fromLocationId: locationId }, { toLocationId: locationId }],
        }),
        ...(type && { type }),
      },
    }),
  ]);

  return NextResponse.json({
    transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

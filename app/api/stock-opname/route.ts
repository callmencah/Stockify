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

  const opnames = await prisma.stockOpname.findMany({
    where: { ...(status && { status }) },
    include: {
      location: true,
      user: { select: { id: true, name: true } },
      items: { include: { item: { include: { unit: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(opnames);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { locationId, notes } = body;

  if (!locationId) {
    return NextResponse.json({ error: "Lokasi diperlukan" }, { status: 400 });
  }

  // Get current stock for all items in the location
  const itemLocations = await prisma.itemLocation.findMany({
    where: { locationId },
    include: { item: true },
  });

  const number = generateOrderNumber("OPN");

  const opname = await prisma.stockOpname.create({
    data: {
      number,
      locationId,
      notes,
      status: "IN_PROGRESS",
      userId: session.user.id,
      items: {
        create: itemLocations.map((il) => ({
          itemId: il.itemId,
          systemQty: il.quantity,
        })),
      },
    },
    include: {
      location: true,
      user: { select: { id: true, name: true } },
      items: { include: { item: { include: { unit: true } } } },
    },
  });

  return NextResponse.json(opname, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get("barcode");
  const sku = searchParams.get("sku");

  const item = await prisma.item.findFirst({
    where: {
      OR: [
        ...(barcode ? [{ barcode }] : []),
        ...(sku ? [{ sku }] : []),
      ],
    },
    include: {
      category: true,
      unit: true,
      itemLocations: { include: { location: true } },
    },
  });

  if (!item) return NextResponse.json({ error: "Item tidak ditemukan" }, { status: 404 });
  return NextResponse.json(item);
}

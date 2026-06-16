import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");
  const itemId = searchParams.get("itemId");
  const lowStock = searchParams.get("lowStock") === "true";

  const itemLocations = await prisma.itemLocation.findMany({
    where: {
      ...(locationId && { locationId }),
      ...(itemId && { itemId }),
    },
    include: {
      item: {
        include: { category: true, unit: true },
      },
      location: true,
    },
    orderBy: { item: { name: "asc" } },
  });

  let result = itemLocations;
  if (lowStock) {
    result = itemLocations.filter(
      (il) => il.quantity <= il.item.reorderPoint
    );
  }

  return NextResponse.json(result);
}

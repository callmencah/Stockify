import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");
  const search = searchParams.get("search") || "";
  const filter = searchParams.get("filter") || "all";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  const searchPattern = `%${search}%`;

  try {
    // 1. Fetch matching ItemLocation IDs with pagination & filtering
    const matchingIdsResult = await prisma.$queryRaw<{ id: string }[]>`
      SELECT il.id
      FROM "ItemLocation" il
      JOIN "Item" i ON il."itemId" = i.id
      WHERE 1=1
        ${locationId && locationId !== "all" ? Prisma.sql`AND il."locationId" = ${locationId}` : Prisma.sql``}
        ${search ? Prisma.sql`AND (i.name ILIKE ${searchPattern} OR i.sku ILIKE ${searchPattern})` : Prisma.sql``}
        ${filter === "low" ? Prisma.sql`AND il.quantity <= i."reorderPoint" AND il.quantity > 0` : Prisma.sql``}
        ${filter === "out" ? Prisma.sql`AND il.quantity <= 0` : Prisma.sql``}
        ${filter === "normal" ? Prisma.sql`AND il.quantity > i."reorderPoint"` : Prisma.sql``}
      ORDER BY i.name ASC
      LIMIT ${limit} OFFSET ${skip}
    `;
    const ids = matchingIdsResult.map((r) => r.id);

    // 2. Fetch total count for pagination metadata
    const totalCountResult = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int as count
      FROM "ItemLocation" il
      JOIN "Item" i ON il."itemId" = i.id
      WHERE 1=1
        ${locationId && locationId !== "all" ? Prisma.sql`AND il."locationId" = ${locationId}` : Prisma.sql``}
        ${search ? Prisma.sql`AND (i.name ILIKE ${searchPattern} OR i.sku ILIKE ${searchPattern})` : Prisma.sql``}
        ${filter === "low" ? Prisma.sql`AND il.quantity <= i."reorderPoint" AND il.quantity > 0` : Prisma.sql``}
        ${filter === "out" ? Prisma.sql`AND il.quantity <= 0` : Prisma.sql``}
        ${filter === "normal" ? Prisma.sql`AND il.quantity > i."reorderPoint"` : Prisma.sql``}
    `;
    const total = Number(totalCountResult[0]?.count || 0);

    // 3. Fetch full records for the matched IDs using Prisma (retaining includes & type safety)
    const items = await prisma.itemLocation.findMany({
      where: { id: { in: ids } },
      include: {
        item: {
          include: { category: true, unit: true },
        },
        location: true,
      },
    });

    // 4. Map back to preserve order by item name
    const itemsMap = new Map(items.map((item) => [item.id, item]));
    const sortedItems = ids.map((id) => itemsMap.get(id)).filter(Boolean);

    // 5. Calculate summary statistics on the filtered dataset (without pagination)
    const summaryResult = await prisma.$queryRaw<{ 
      totalValue: number | null;
      lowCount: number;
      outCount: number;
    }[]>`
      SELECT 
        SUM(il.quantity * i."buyPrice") as "totalValue",
        COALESCE(SUM(CASE WHEN il.quantity <= i."reorderPoint" AND il.quantity > 0 THEN 1 ELSE 0 END), 0)::int as "lowCount",
        COALESCE(SUM(CASE WHEN il.quantity <= 0 THEN 1 ELSE 0 END), 0)::int as "outCount"
      FROM "ItemLocation" il
      JOIN "Item" i ON il."itemId" = i.id
      WHERE 1=1
        ${locationId && locationId !== "all" ? Prisma.sql`AND il."locationId" = ${locationId}` : Prisma.sql``}
        ${search ? Prisma.sql`AND (i.name ILIKE ${searchPattern} OR i.sku ILIKE ${searchPattern})` : Prisma.sql``}
        ${filter === "low" ? Prisma.sql`AND il.quantity <= i."reorderPoint" AND il.quantity > 0` : Prisma.sql``}
        ${filter === "out" ? Prisma.sql`AND il.quantity <= 0` : Prisma.sql``}
        ${filter === "normal" ? Prisma.sql`AND il.quantity > i."reorderPoint"` : Prisma.sql``}
    `;

    const summary = {
      totalValue: summaryResult[0]?.totalValue || 0,
      lowCount: summaryResult[0]?.lowCount || 0,
      outCount: summaryResult[0]?.outCount || 0,
    };

    return NextResponse.json({
      items: sortedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    });
  } catch (error) {
    console.error("Error in GET /api/inventory:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

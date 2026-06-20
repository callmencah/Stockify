import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Parallel counts and lists (fast queries)
  const [
    totalItems,
    totalLocations,
    pendingPOs,
    pendingSOs,
    todayTransactions,
    unreadNotifications,
    recentTransactions,
  ] = await Promise.all([
    prisma.item.count({ where: { isActive: true } }),
    prisma.location.count({ where: { isActive: true } }),
    prisma.purchaseOrder.count({ where: { status: { in: ["DRAFT", "SENT", "PARTIAL"] } } }),
    prisma.salesOrder.count({ where: { status: { in: ["DRAFT", "CONFIRMED", "SHIPPED"] } } }),
    prisma.stockTransaction.count({ where: { createdAt: { gte: today } } }),
    prisma.notification.count({ where: { userId: session.user.id, isRead: false } }),
    prisma.stockTransaction.findMany({
      include: {
        item: { select: { name: true, sku: true } },
        user: { select: { name: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // 2. High-performance aggregate raw queries
  // Calculate total stock value: SUM(il.quantity * i.buyPrice)
  const totalStockValueResult = await prisma.$queryRaw<{ totalStockValue: number | null }[]>`
    SELECT SUM(il.quantity * i."buyPrice") as "totalStockValue"
    FROM "ItemLocation" il
    JOIN "Item" i ON il."itemId" = i.id
  `;
  const totalStockValue = totalStockValueResult[0]?.totalStockValue || 0;

  // Calculate low stock and out of stock counts
  const lowStockCountResult = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int as count
    FROM "ItemLocation" il
    JOIN "Item" i ON il."itemId" = i.id
    WHERE il.quantity <= i."reorderPoint" AND il.quantity > 0
  `;
  const lowStockCount = Number(lowStockCountResult[0]?.count || 0);

  const outOfStockCountResult = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int as count
    FROM "ItemLocation" il
    WHERE il.quantity <= 0
  `;
  const outOfStockCount = Number(outOfStockCountResult[0]?.count || 0);

  // Fetch top 10 low stock items (fetch IDs first then Prisma query for relations)
  const lowStockIdsResult = await prisma.$queryRaw<{ id: string }[]>`
    SELECT il.id
    FROM "ItemLocation" il
    JOIN "Item" i ON il."itemId" = i.id
    WHERE il.quantity <= i."reorderPoint" AND il.quantity > 0
    LIMIT 10
  `;
  const lowStockIds = lowStockIdsResult.map((r) => r.id);

  const lowStockItems = await prisma.itemLocation.findMany({
    where: { id: { in: lowStockIds } },
    include: {
      item: { include: { unit: true } },
      location: true,
    },
  });

  // Optimized stock by location calculation using Raw SQL
  const stockByLocationResult = await prisma.$queryRaw<{ name: string; value: number | null; items: number }[]>`
    SELECT 
      l.name,
      COALESCE(SUM(il.quantity * i."buyPrice"), 0)::float as "value",
      COUNT(il.id)::int as "items"
    FROM "Location" l
    LEFT JOIN "ItemLocation" il ON l.id = il."locationId"
    LEFT JOIN "Item" i ON il."itemId" = i.id
    WHERE l."isActive" = true
    GROUP BY l.id, l.name
  `;
  const stockByLocation = stockByLocationResult.map((loc) => ({
    name: loc.name,
    value: loc.value || 0,
    items: loc.items || 0,
  }));

  // Monthly transactions for chart
  const last6Months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    last6Months.push({ monthStart, monthEnd, label: date.toLocaleString("id-ID", { month: "short" }) });
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const monthlySums = await prisma.$queryRaw<{ month: Date; type: string; quantity: number }[]>`
    SELECT 
      DATE_TRUNC('month', "createdAt") as month,
      type,
      COALESCE(SUM(quantity), 0)::float as quantity
    FROM "StockTransaction"
    WHERE type IN ('PURCHASE', 'SALE') AND "createdAt" >= ${sixMonthsAgo}
    GROUP BY DATE_TRUNC('month', "createdAt"), type
  `;

  const monthlyData = last6Months.map(({ monthStart, monthEnd, label }) => {
    const purchaseRow = monthlySums.find(
      (r) => new Date(r.month).getMonth() === monthStart.getMonth() && r.type === "PURCHASE"
    );
    const saleRow = monthlySums.find(
      (r) => new Date(r.month).getMonth() === monthStart.getMonth() && r.type === "SALE"
    );
    return {
      month: label,
      purchases: purchaseRow?.quantity || 0,
      sales: saleRow?.quantity || 0,
    };
  });

  return NextResponse.json({
    stats: {
      totalItems,
      totalLocations,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
      pendingPOs,
      pendingSOs,
      todayTransactions,
      unreadNotifications,
    },
    recentTransactions,
    lowStockItems,
    stockByLocation,
    monthlyData,
  });
}

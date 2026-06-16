import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalItems,
    totalLocations,
    itemLocations,
    pendingPOs,
    pendingSOs,
    todayTransactions,
    unreadNotifications,
    recentTransactions,
    lowStockItems,
  ] = await Promise.all([
    prisma.item.count({ where: { isActive: true } }),
    prisma.location.count({ where: { isActive: true } }),
    prisma.itemLocation.findMany({
      include: { item: { select: { buyPrice: true, reorderPoint: true, minStock: true, name: true, sku: true } }, location: true },
    }),
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
    prisma.itemLocation.findMany({
      where: {},
      include: {
        item: { include: { unit: true } },
        location: true,
      },
    }),
  ]);

  const totalStockValue = itemLocations.reduce(
    (sum, il) => sum + il.quantity * il.item.buyPrice,
    0
  );

  const lowStock = lowStockItems.filter(
    (il) => il.quantity <= il.item.reorderPoint && il.quantity > 0
  );

  const outOfStock = lowStockItems.filter((il) => il.quantity <= 0);

  // Stock by location
  const locationStats = await prisma.location.findMany({
    where: { isActive: true },
    include: {
      itemLocations: {
        include: { item: { select: { buyPrice: true } } },
      },
    },
  });

  const stockByLocation = locationStats.map((loc) => ({
    name: loc.name,
    value: loc.itemLocations.reduce(
      (sum, il) => sum + il.quantity * il.item.buyPrice,
      0
    ),
    items: loc.itemLocations.length,
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

  const monthlyData = await Promise.all(
    last6Months.map(async ({ monthStart, monthEnd, label }) => {
      const [purchases, sales] = await Promise.all([
        prisma.stockTransaction.aggregate({
          where: { type: "PURCHASE", createdAt: { gte: monthStart, lte: monthEnd } },
          _sum: { quantity: true },
        }),
        prisma.stockTransaction.aggregate({
          where: { type: "SALE", createdAt: { gte: monthStart, lte: monthEnd } },
          _sum: { quantity: true },
        }),
      ]);
      return {
        month: label,
        purchases: purchases._sum.quantity || 0,
        sales: sales._sum.quantity || 0,
      };
    })
  );

  return NextResponse.json({
    stats: {
      totalItems,
      totalLocations,
      totalStockValue,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      pendingPOs,
      pendingSOs,
      todayTransactions,
      unreadNotifications,
    },
    recentTransactions,
    lowStockItems: lowStock.slice(0, 10),
    stockByLocation,
    monthlyData,
  });
}

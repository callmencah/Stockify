import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const locationId = searchParams.get("locationId");

  const dateFilter = {
    ...(startDate && { gte: new Date(startDate) }),
    ...(endDate && { lte: new Date(endDate) }),
  };

  if (type === "stock_value") {
    const itemLocations = await prisma.itemLocation.findMany({
      where: { ...(locationId && { locationId }) },
      include: {
        item: { include: { category: true, unit: true } },
        location: true,
      },
      orderBy: { item: { name: "asc" } },
    });

    const data = itemLocations.map((il) => ({
      ...il,
      totalValue: il.quantity * il.item.buyPrice,
    }));

    const totalValue = data.reduce((sum, d) => sum + d.totalValue, 0);

    return NextResponse.json({ data, totalValue });
  }

  if (type === "transactions") {
    const transactions = await prisma.stockTransaction.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        ...(locationId && {
          OR: [{ fromLocationId: locationId }, { toLocationId: locationId }],
        }),
      },
      include: {
        item: { include: { unit: true } },
        fromLocation: true,
        toLocation: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(transactions);
  }

  if (type === "low_stock") {
    const itemLocations = await prisma.itemLocation.findMany({
      where: { ...(locationId && { locationId }) },
      include: {
        item: { include: { category: true, unit: true } },
        location: true,
      },
    });

    const lowStock = itemLocations.filter(
      (il) => il.quantity <= il.item.reorderPoint
    );

    return NextResponse.json(lowStock);
  }

  if (type === "sales_summary") {
    const salesItems = await prisma.salesOrderItem.findMany({
      where: {
        salesOrder: {
          status: { not: "CANCELLED" },
          ...(Object.keys(dateFilter).length > 0 && { orderDate: dateFilter }),
          ...(locationId && { locationId }),
        },
      },
      include: {
        item: { include: { category: true, unit: true } },
        salesOrder: { include: { customer: true } },
      },
    });

    // Aggregate by item
    const itemMap = new Map<
      string,
      { item: unknown; totalQty: number; totalRevenue: number }
    >();

    for (const si of salesItems) {
      const key = si.itemId;
      const existing = itemMap.get(key);
      const revenue =
        si.quantity * si.unitPrice * (1 - si.discount / 100);
      if (existing) {
        existing.totalQty += si.quantity;
        existing.totalRevenue += revenue;
      } else {
        itemMap.set(key, {
          item: si.item,
          totalQty: si.quantity,
          totalRevenue: revenue,
        });
      }
    }

    const data = Array.from(itemMap.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue
    );

    return NextResponse.json(data);
  }

  if (type === "purchase_summary") {
    const poItems = await prisma.purchaseOrderItem.findMany({
      where: {
        purchaseOrder: {
          status: "RECEIVED",
          ...(Object.keys(dateFilter).length > 0 && { orderDate: dateFilter }),
          ...(locationId && { locationId }),
        },
      },
      include: {
        item: { include: { category: true, unit: true } },
        purchaseOrder: { include: { supplier: true } },
      },
    });

    const itemMap = new Map<
      string,
      { item: unknown; totalQty: number; totalCost: number }
    >();

    for (const pi of poItems) {
      const key = pi.itemId;
      const existing = itemMap.get(key);
      const cost = pi.receivedQty * pi.unitCost;
      if (existing) {
        existing.totalQty += pi.receivedQty;
        existing.totalCost += cost;
      } else {
        itemMap.set(key, {
          item: pi.item,
          totalQty: pi.receivedQty,
          totalCost: cost,
        });
      }
    }

    return NextResponse.json(Array.from(itemMap.values()));
  }

  if (type === "audit_log") {
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(logs);
  }

  return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
}

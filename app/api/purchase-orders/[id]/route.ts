import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      location: true,
      user: { select: { id: true, name: true } },
      items: { include: { item: { include: { unit: true, category: true } } } },
    },
  });

  if (!po) return NextResponse.json({ error: "PO tidak ditemukan" }, { status: 404 });
  return NextResponse.json(po);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const po = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: body.status,
      notes: body.notes,
      expectedDate: body.expectedDate ? new Date(body.expectedDate) : undefined,
    },
  });

  return NextResponse.json(po);
}

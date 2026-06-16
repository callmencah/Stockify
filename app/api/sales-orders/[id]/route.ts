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
  const so = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      location: true,
      user: { select: { id: true, name: true } },
      items: { include: { item: { include: { unit: true, category: true } } } },
    },
  });

  if (!so) return NextResponse.json({ error: "SO tidak ditemukan" }, { status: 404 });
  return NextResponse.json(so);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const so = await prisma.salesOrder.update({
    where: { id },
    data: { status: body.status, notes: body.notes },
  });

  return NextResponse.json(so);
}

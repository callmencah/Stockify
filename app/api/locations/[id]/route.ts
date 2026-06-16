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
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      itemLocations: {
        include: { item: { include: { category: true, unit: true } } },
        orderBy: { item: { name: "asc" } },
      },
    },
  });

  if (!location) return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  return NextResponse.json(location);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const location = await prisma.location.update({
    where: { id },
    data: {
      name: body.name,
      address: body.address,
      type: body.type,
      isActive: body.isActive,
    },
  });

  return NextResponse.json(location);
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const isActive = searchParams.get("isActive");

  const locations = await prisma.location.findMany({
    where: {
      ...(type && { type }),
      ...(isActive !== null && isActive !== undefined && { isActive: isActive === "true" }),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(locations);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  try {
    const location = await prisma.location.create({
      data: {
        code: body.code,
        name: body.name,
        address: body.address,
        type: body.type || "WAREHOUSE",
      },
    });
    return NextResponse.json(location, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Kode lokasi sudah digunakan" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal membuat lokasi" }, { status: 500 });
  }
}

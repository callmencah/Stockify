import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  const suppliers = await prisma.supplier.findMany({
    where: {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
        ],
      }),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(suppliers);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  try {
    const supplier = await prisma.supplier.create({
      data: {
        code: body.code,
        name: body.name,
        contact: body.contact,
        email: body.email,
        phone: body.phone,
        address: body.address,
      },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Kode supplier sudah digunakan" }, { status: 409 });
    }
    return NextResponse.json({ error: "Gagal membuat supplier" }, { status: 500 });
  }
}

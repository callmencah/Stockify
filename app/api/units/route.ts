import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const units = await prisma.unit.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(units);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const unit = await prisma.unit.create({
    data: { name: body.name, abbreviation: body.abbreviation },
  });
  return NextResponse.json(unit, { status: 201 });
}

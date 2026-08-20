import { NextRequest, NextResponse } from 'next/server';
import { db, groups, groupMembers, users } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const groupId = searchParams.get('groupId');

  if (groupId) {
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
      with: { members: true }
    });
    return NextResponse.json(group);
  }

  if (userId) {
    const groupsList = await db.query.groups.findMany({
      where: eq(groups.adminId, userId),
      with: { members: true },
      orderBy: desc(groups.createdAt)
    });
    return NextResponse.json(groupsList);
  }

  return NextResponse.json({ error: 'userId or groupId diperlukan' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, adminId } = body;

  if (!name || !adminId) return NextResponse.json({ error: 'name dan adminId diperlukan' }, { status: 400 });

  const [newGroup] = await db.insert(groups).values({
    name,
    adminId,
    code: `ARISAN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  }).returning();

  return NextResponse.json(newGroup);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { groupId, name } = body;

  if (!groupId || !name) return NextResponse.json({ error: 'groupId dan name diperlukan' }, { status: 400 });

  await db.update(groups).set({ name }).where(eq(groups.id, groupId));
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('groupId');

  if (groupId) {
    await db.delete(groups).where(eq(groups.id, groupId));
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'groupId diperlukan' }, { status: 400 });
}
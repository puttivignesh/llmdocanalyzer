import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = 20;
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const results = await db.select({
      id: documents.id,
      filename: documents.filename,
      created_at: documents.createdAt
    })
    .from(documents)
    .orderBy(desc(documents.createdAt))
    .limit(limit)
    .offset(offset);
    
    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(documents);
    
    const total = Number(totalResult[0]?.count || 0);
    
    return NextResponse.json({
      items: results,
      total
    });
  } catch (error) {
    console.error('Documents GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
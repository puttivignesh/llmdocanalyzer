import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents, analysisResults } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get counts for documents and analysis results
    const [docCountResult, analysisCountResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(documents),
      db.select({ count: sql<number>`count(*)` }).from(analysisResults)
    ]);

    const documentsCount = Number(docCountResult[0]?.count || 0);
    const analysesCount = Number(analysisCountResult[0]?.count || 0);

    return NextResponse.json({
      documents: documentsCount,
      analyses: analysesCount
    });
  } catch (error) {
    console.error('Statistics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
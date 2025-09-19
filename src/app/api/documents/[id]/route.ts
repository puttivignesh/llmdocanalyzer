import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents, analysisResults } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid document ID is required' },
        { status: 400 }
      );
    }

    const documentId = parseInt(id);

    const documentResult = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (documentResult.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const document = documentResult[0];

    const analysisResult = await db
      .select()
      .from(analysisResults)
      .where(eq(analysisResults.docId, documentId))
      .orderBy(desc(analysisResults.createdAt))
      .limit(1);

    let latestAnalysis = undefined;
    if (analysisResult.length > 0) {
      const analysis = analysisResult[0];
      try {
        const parsedResult = JSON.parse(analysis.resultJson);
        latestAnalysis = {
          id: analysis.id,
          doc_id: analysis.docId,
          result_json: parsedResult,
          created_at: analysis.createdAt
        };
      } catch (parseError) {
        console.error('Failed to parse result_json:', parseError);
        latestAnalysis = {
          id: analysis.id,
          doc_id: analysis.docId,
          result_json: null,
          created_at: analysis.createdAt
        };
      }
    }

    const response = {
      id: document.id,
      filename: document.filename,
      text: document.text,
      created_at: document.createdAt,
      latest_analysis: latestAnalysis
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET document error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
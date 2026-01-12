import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{}> }
) {
  return NextResponse.json({ error: 'This endpoint is disabled' }, { status: 403 });
}


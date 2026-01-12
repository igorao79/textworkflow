import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Test API works!' });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log('Test API received:', body);
  return NextResponse.json({ message: 'Test API received data', data: body });
}

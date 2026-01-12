import { NextResponse } from 'next/server';

console.log('🔥 API /test/route.ts: File loaded!');

export async function GET() {
  console.log('🚀 === API /test GET handler called! ===');
  return NextResponse.json({ message: 'Test API works!', timestamp: new Date().toISOString() });
}

export async function POST() {
  console.log('🚀 === API /test POST handler called! ===');
  return NextResponse.json({ message: 'Test POST API works!', timestamp: new Date().toISOString() });
}


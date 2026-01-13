import { NextRequest, NextResponse } from 'next/server';
import { processQStashWebhook } from '@/services/qstashService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('🧪 Manual QStash webhook test');

  try {
    const body = await request.text();
    let payload;

    try {
      payload = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ Failed to parse test body:', parseError);
      return NextResponse.json({
        error: 'Invalid JSON',
        received: body.substring(0, 200) + '...'
      }, { status: 400 });
    }

    console.log('📋 Test payload:', payload);

    // Проверяем структуру payload
    if (!payload.workflowId || payload.trigger !== 'cron' || payload.source !== 'qstash') {
      return NextResponse.json({
        error: 'Invalid payload structure',
        expected: {
          workflowId: 'string',
          trigger: 'cron',
          source: 'qstash',
          timestamp: 'optional string'
        },
        received: payload
      }, { status: 400 });
    }

    // Обрабатываем webhook
    await processQStashWebhook(payload);

    return NextResponse.json({
      success: true,
      message: 'QStash webhook test completed',
      payload: payload,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Error in webhook test:', error);
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET метод для проверки доступности endpoint
export async function GET(request: NextRequest) {
  console.log('🔍 QStash webhook endpoint health check');
  console.log('📋 Request details:', {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString()
  });

  const currentUrl = new URL(request.url);
  const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;

  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/qstash/webhook',
    methods: ['POST', 'PUT'],
    testEndpoint: '/api/qstash/test',
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      currentBaseUrl: baseUrl,
      webhookUrl: `${baseUrl}/api/qstash/webhook`,
      testUrl: `${baseUrl}/api/qstash/test`
    },
    instructions: {
      vercel: 'Установите NEXT_PUBLIC_APP_URL=https://textworkflow.vercel.app в Vercel Environment Variables',
      qstash: 'Создайте новый cron schedule после установки правильного URL'
    }
  });
}

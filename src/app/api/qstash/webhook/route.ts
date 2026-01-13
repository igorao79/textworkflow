import { NextRequest, NextResponse } from 'next/server';
import { verifyQStashWebhook, processQStashWebhook } from '@/services/qstashService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('🎣 QStash webhook received');

  try {
    // Получаем данные для верификации
    const signature = request.headers.get('upstash-signature');
    const body = await request.text();
    const url = request.url;

    console.log('📋 Webhook headers:', {
      signature: signature?.substring(0, 50) + '...',
      url,
      bodyLength: body.length
    });

    // Верифицируем подпись
    if (!signature) {
      console.error('❌ Missing upstash-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const isValid = await verifyQStashWebhook(signature, body, url);
    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Парсим и обрабатываем payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ Failed to parse webhook body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Обрабатываем webhook
    await processQStashWebhook(payload);

    console.log('✅ QStash webhook processed successfully');
    return NextResponse.json({ received: true, processed: true });

  } catch (error) {
    console.error('💥 Error processing QStash webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Метод для тестирования (без верификации)
export async function PUT(request: NextRequest) {
  console.log('🧪 Test QStash webhook received (no verification)');

  try {
    const body = await request.text();
    let payload;

    try {
      payload = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ Failed to parse test webhook body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Обрабатываем webhook без верификации (для тестирования)
    await processQStashWebhook(payload);

    console.log('✅ Test QStash webhook processed successfully');
    return NextResponse.json({ received: true, processed: true, test: true });

  } catch (error) {
    console.error('💥 Error processing test QStash webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

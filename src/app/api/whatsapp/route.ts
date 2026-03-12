import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phone, apikey, message } = await request.json();

    if (!phone || !apikey || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Sanitize phone number: remove spaces, dashes, parentheses — keep only digits and leading +
    const cleanPhone = phone.replace(/[\s\-()]/g, '');

    const encodedMessage = encodeURIComponent(message);

    // Use CallMeBot WhatsApp API (free, reliable)
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(cleanPhone)}&text=${encodedMessage}&apikey=${encodeURIComponent(apikey)}`;

    console.log('[WhatsApp API] Sending to:', cleanPhone);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/json',
      },
    });

    const text = await response.text();
    console.log('[WhatsApp API] Response status:', response.status, 'Body:', text.substring(0, 300));

    // CallMeBot returns HTML — check for success indicators
    const lowerText = text.toLowerCase();
    const isSuccess = response.ok && (
      lowerText.includes('message queued') ||
      lowerText.includes('message sent') ||
      lowerText.includes('success')
    );

    const isNotLinked = lowerText.includes('not linked') || lowerText.includes('not associated') || lowerText.includes('not found');

    if (isSuccess) {
      return NextResponse.json({ success: true, data: { message: 'Message queued for delivery' } });
    } else if (isNotLinked) {
      return NextResponse.json(
        {
          success: false,
          error: 'Phone number not linked. Send "I allow callmebot to send me messages" to +34 644 71 98 98 on WhatsApp first.',
          needsRegistration: true,
        },
        { status: 200 }
      );
    } else {
      // Strip HTML tags for cleaner error
      const cleanText = text.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, ' ').trim().substring(0, 200);
      console.error('[WhatsApp API] Failed:', cleanText);
      return NextResponse.json(
        { success: false, error: cleanText || 'Failed to send message' },
        { status: response.ok ? 200 : response.status }
      );
    }
  } catch (error) {
    console.error('[WhatsApp API] Proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

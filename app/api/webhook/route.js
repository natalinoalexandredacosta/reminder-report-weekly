const { bot } = require('../../../../lib/bot');

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json();
    await bot.handleUpdate(body);
    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('Error', { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return Response.json({ error: 'Razorpay not configured on the server.' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const { plan } = await req.json();
    const amount =
      plan === 'pro_monthly' ? 9900 :
      plan === 'pro_yearly' ? 99900 :
      plan === 'pro' ? 29900 :
      49900;

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `order_${Date.now()}`
    });

    await supabase.from('Payment').insert({
      userId: user.id,
      amount: amount / 100,
      currency: 'INR',
      gateway: 'razorpay',
      orderId: order.id,
      plan,
      status: 'pending'
    });

    return Response.json({
      orderId: order.id,
      amount,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (e) {
    console.error('🔥 Razorpay Order Route Error:', e);
    return Response.json({ error: 'Razorpay order failed: ' + e.message }, { status: 500 });
  }
}

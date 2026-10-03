import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

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

    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'Stripe not configured on the server.' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { plan } = await req.json();
    const amount = plan === 'pro' ? 299 : 999;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `Upscale Tracker ${plan === 'pro' ? 'Pro' : 'Enterprise'}`
            },
            unit_amount: amount * 100
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${frontendUrl}/pricing`,
      metadata: { userId: user.id, plan }
    });

    await supabase.from('Payment').insert({
      userId: user.id,
      amount,
      currency: 'INR',
      gateway: 'stripe',
      orderId: session.id,
      plan,
      status: 'pending'
    });

    return Response.json({ url: session.url });
  } catch (e) {
    console.error('🔥 Stripe Session Route Error:', e);
    return Response.json({ error: 'Failed to create session: ' + e.message }, { status: 500 });
  }
}

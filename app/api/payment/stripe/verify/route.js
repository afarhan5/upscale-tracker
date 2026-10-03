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
    const { sessionId, plan } = await req.json();

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return Response.json({ error: 'Payment not completed' }, { status: 400 });
    }

    await supabase
      .from('Payment')
      .update({ status: 'completed' })
      .eq('orderId', sessionId);

    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update({ plan })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      return Response.json({ error: 'Failed to update user profile: ' + updateError.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      user: updatedUser,
      plan
    });
  } catch (e) {
    console.error('🔥 Stripe Verify Route Error:', e);
    return Response.json({ error: 'Verification failed: ' + e.message }, { status: 500 });
  }
}

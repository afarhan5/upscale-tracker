import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

    const { orderId, paymentId, signature, plan } = await req.json();

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return Response.json({ error: 'Razorpay secret not configured.' }, { status: 500 });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expected !== signature) {
      return Response.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    await supabase
      .from('Payment')
      .update({ status: 'completed' })
      .eq('orderId', orderId);

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
    console.error('🔥 Razorpay Verify Route Error:', e);
    return Response.json({ error: 'Verification failed: ' + e.message }, { status: 500 });
  }
}

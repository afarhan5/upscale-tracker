import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, type, otp } = body;

    if (action === 'send') {
      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      // Set expiry to 10 minutes from now
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Store OTP in public.User table (try DB first)
      const { error: dbError } = await supabase
        .from('User')
        .update({ otpCode, otpExpiry })
        .eq('id', user.id);

      if (dbError) {
        console.warn('⚠️ Storing OTP in DB failed (likely missing columns). Falling back to in-memory store:', dbError.message);
        global.devOtpStore = global.devOtpStore || new Map();
        global.devOtpStore.set(user.id, { otpCode, otpExpiry });
      }

      // Send OTP to user email
      let emailSent = false;
      let emailError = null;

      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      const actionText = type === 'change-password' ? 'Change Password' : 'Delete Account';
      const emailBody = `
        <div style="font-family: sans-serif; padding: 20px; color: #1a1033; background-color: #f0f2ff;">
          <h2 style="color: #6d28d9;">Upscale Tracker Security</h2>
          <p>You requested an OTP (One-Time Password) to <strong>${actionText}</strong> for your account.</p>
          <div style="background-color: #ffffff; border: 1px solid #dde1f0; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 5px; color: #6d28d9;">${otpCode}</span>
          </div>
          <p style="font-size: 12px; color: #6b7280;">This OTP is valid for 10 minutes. If you did not request this, please secure your account immediately.</p>
        </div>
      `;

      if (smtpHost && smtpUser && smtpPass) {
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort) || 587,
            secure: smtpPort == 465,
            auth: {
              user: smtpUser,
              pass: smtpPass
            }
          });

          await transporter.sendMail({
            from: `"Upscale Tracker" <${smtpUser}>`,
            to: user.email,
            subject: `Upscale Tracker: OTP for ${actionText}`,
            html: emailBody
          });
          emailSent = true;
        } catch (err) {
          console.error('❌ Failed to send SMTP email:', err);
          emailError = err.message;
        }
      }

      console.log(`--- [OTP SERVICE] ---`);
      console.log(`User: ${user.email}`);
      console.log(`Action: ${actionText}`);
      console.log(`OTP Code: ${otpCode}`);
      console.log(`---------------------`);

      return Response.json({
        success: true,
        message: emailSent ? 'OTP sent to your email!' : 'OTP generated successfully (check server logs/console).',
        // In development or if SMTP is not configured, we return the OTP code to allow easy local testing via a dev-notice
        ...(process.env.NODE_ENV === 'development' || !emailSent ? { devOtp: otpCode } : {})
      });
    }

    if (action === 'verify') {
      if (!otp) {
        return Response.json({ error: 'OTP code is required' }, { status: 400 });
      }

      // Fetch user profile from DB
      const { data: profile, error: dbError } = await supabase
        .from('User')
        .select('otpCode, otpExpiry')
        .eq('id', user.id)
        .single();

      let otpCodeVal = profile?.otpCode;
      let otpExpiryVal = profile?.otpExpiry;

      // Fallback check in memory
      if (!otpCodeVal && global.devOtpStore && global.devOtpStore.has(user.id)) {
        const stored = global.devOtpStore.get(user.id);
        otpCodeVal = stored.otpCode;
        otpExpiryVal = stored.otpExpiry;
      }

      if (!otpCodeVal) {
        return Response.json({ error: 'OTP code not found. Please request a new one.' }, { status: 404 });
      }

      // Validate OTP
      if (otpCodeVal !== otp) {
        return Response.json({ error: 'Invalid OTP code' }, { status: 400 });
      }

      const expiryDate = new Date(otpExpiryVal);
      if (expiryDate < new Date()) {
        return Response.json({ error: 'OTP has expired' }, { status: 400 });
      }

      // Clear OTP from DB upon successful verification
      await supabase
        .from('User')
        .update({ otpCode: null, otpExpiry: null })
        .eq('id', user.id);

      if (global.devOtpStore) {
        global.devOtpStore.delete(user.id);
      }

      return Response.json({ success: true, message: 'OTP verified successfully!' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('🔥 OTP Route Error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

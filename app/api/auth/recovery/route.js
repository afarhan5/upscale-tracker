import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, recoveryEmail, otp, newPassword, changePrimaryEmail } = body;

    if (!recoveryEmail) {
      return Response.json({ error: 'Recovery email is required' }, { status: 400 });
    }

    // Initialize regular supabase client (which bypasses RLS on public.User select/update)
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. SEND OTP ACTION
    if (action === 'send-otp') {
      // Find the user by recoveryEmail in the public.User table
      const { data: userRecord, error: findError } = await supabase
        .from('User')
        .select('id, email, name')
        .eq('recoveryEmail', recoveryEmail.trim())
        .maybeSingle();

      if (findError) {
        return Response.json({ error: findError.message }, { status: 500 });
      }

      if (!userRecord) {
        return Response.json({ error: 'No account associated with this recovery email.' }, { status: 404 });
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Store OTP in public.User table
      const { error: dbError } = await supabase
        .from('User')
        .update({ otpCode, otpExpiry })
        .eq('id', userRecord.id);

      if (dbError) {
        return Response.json({ error: `Failed to save OTP: ${dbError.message}` }, { status: 500 });
      }

      // Send email to recovery email address
      let emailSent = false;
      let emailError = null;

      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      const emailBody = `
        <div style="font-family: sans-serif; padding: 20px; color: #1a1033; background-color: #f0f2ff;">
          <h2 style="color: #6d28d9;">Upscale Tracker - Account Recovery</h2>
          <p>Hello <strong>${userRecord.name}</strong>,</p>
          <p>We received a request to recover your account using this recovery email.</p>
          <p>Your primary registered login email is: <strong>${userRecord.email}</strong></p>
          <p>Please use the following One-Time Password (OTP) to reset your password and recover access:</p>
          <div style="background-color: #ffffff; border: 1px solid #dde1f0; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 5px; color: #6d28d9;">${otpCode}</span>
          </div>
          <p style="font-size: 12px; color: #6b7280;">This OTP is valid for 10 minutes. If you did not request this, you can safely ignore this email.</p>
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
            to: recoveryEmail.trim(),
            subject: 'Upscale Tracker: Account Recovery OTP',
            html: emailBody
          });
          emailSent = true;
        } catch (err) {
          console.error('❌ Failed to send recovery email:', err);
          emailError = err.message;
        }
      }

      console.log(`--- [RECOVERY OTP SERVICE] ---`);
      console.log(`Primary Email: ${userRecord.email}`);
      console.log(`Recovery Email: ${recoveryEmail}`);
      console.log(`OTP Code: ${otpCode}`);
      console.log(`-----------------------------`);

      return Response.json({
        success: true,
        message: emailSent ? 'OTP code sent to your recovery email!' : 'OTP generated successfully (check server logs).',
        ...(process.env.NODE_ENV === 'development' || !emailSent ? { devOtp: otpCode } : {})
      });
    }

    // 2. VERIFY AND RESET ACTION
    if (action === 'verify-reset') {
      if (!otp || !newPassword) {
        return Response.json({ error: 'OTP and new password are required' }, { status: 400 });
      }

      // Find the user by recoveryEmail in the public.User table
      const { data: userRecord, error: findError } = await supabase
        .from('User')
        .select('id, email, name, otpCode, otpExpiry')
        .eq('recoveryEmail', recoveryEmail.trim())
        .maybeSingle();

      if (findError) {
        return Response.json({ error: findError.message }, { status: 500 });
      }

      if (!userRecord) {
        return Response.json({ error: 'No account associated with this recovery email.' }, { status: 404 });
      }

      // Check OTP code
      if (!userRecord.otpCode || userRecord.otpCode !== otp.trim()) {
        return Response.json({ error: 'Invalid OTP code.' }, { status: 400 });
      }

      // Check expiry
      if (new Date(userRecord.otpExpiry) < new Date()) {
        return Response.json({ error: 'OTP code has expired.' }, { status: 400 });
      }

      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      let updateSuccess = false;
      let warningMsg = null;

      // Update password (and email if requested) in Supabase Auth using admin key if available
      if (serviceRoleKey) {
        try {
          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
          
          const updateData = { password: newPassword };
          if (changePrimaryEmail) {
            updateData.email = recoveryEmail.trim();
            updateData.email_confirm = true;
          }

          const { error: adminError } = await supabaseAdmin.auth.admin.updateUserById(userRecord.id, updateData);
          if (adminError) {
            return Response.json({ error: `Admin update failed: ${adminError.message}` }, { status: 500 });
          }

          // If primary email is changed, update it in public.User table too
          if (changePrimaryEmail) {
            await supabase.from('User').update({ email: recoveryEmail.trim() }).eq('id', userRecord.id);
          }

          updateSuccess = true;
        } catch (err) {
          return Response.json({ error: `Failed during authentication update: ${err.message}` }, { status: 500 });
        }
      } else {
        // Fallback for local development without admin keys
        console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is not defined. Cannot update auth.users password.');
        warningMsg = 'OTP verified! However, to update the actual login password, please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.';
      }

      // Clear OTP
      await supabase
        .from('User')
        .update({ otpCode: null, otpExpiry: null })
        .eq('id', userRecord.id);

      return Response.json({
        success: true,
        message: warningMsg || 'Account recovered successfully! You can now log in.',
        devWarning: warningMsg
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Account recovery error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

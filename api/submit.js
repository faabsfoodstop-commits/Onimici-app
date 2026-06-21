import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

const profileDescriptions = {
  'Fully Ready': 'You have a clear vision for your future, strong self-awareness, and the emotional maturity needed for a serious partnership. You are ready for a meaningful relationship.',
  'Intentionally Growing': 'You are actively building toward a serious relationship. Your values are clear and your readiness is high — you may benefit from a partner who matches your growth mindset.',
  'Exploring Your Path': 'You have a strong foundation but some areas may need more clarity. Self-reflection now will pay off deeply in a future relationship.',
  'Building Your Foundation': 'You are on the journey. Some important dimensions may still be developing. That is okay. Awareness is the first step.'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const params = req.body;
    const type = params.type || 'unknown';

    if (type === 'assessment') {
      return await handleAssessment(params, res);
    } else if (type === 'waitlist') {
      return await handleWaitlist(params, res);
    } else {
      return res.status(400).json({ error: 'Unknown type' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleAssessment(params, res) {
  const { email, profile, overall_score, readiness, ...questions } = params;

  const assessmentData = {
    email,
    profile,
    overall_score: parseInt(overall_score),
    readiness,
    ...questions,
  };

  const { error: dbError } = await supabase
    .from('assessments')
    .insert([assessmentData]);

  if (dbError) {
    console.error('Database error:', dbError);
    return res.status(500).json({ error: 'Failed to save assessment' });
  }

  // Send email
  if (email) {
    const profileDesc = profileDescriptions[profile] || '';
    
    const emailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #FF5A4E 0%, #E8463A 100%); color: white; padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 28px;">✦ Your Profile</h1>
            <p style="margin: 5px 0 0; opacity: 0.95;">Relationship Compatibility Assessment</p>
          </div>

          <div style="background: #FAFAFA; border: 1px solid #EAEAEA; border-radius: 10px; padding: 20px; margin-bottom: 20px; text-align: center;">
            <p style="margin: 0 0 10px; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Overall Score</p>
            <h2 style="margin: 0; color: #FF5A4E; font-size: 42px;">${overall_score}</h2>
            <p style="margin: 5px 0 0; color: #666; font-size: 14px;">out of 100</p>
          </div>

          <div style="background: white; border: 1px solid #EAEAEA; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <div style="display: inline-block; background: #FFEEEC; color: #E8463A; font-size: 11px; font-weight: 700; padding: 6px 14px; border-radius: 100px; margin-bottom: 12px; letter-spacing: 1px; text-transform: uppercase;">${profile}</div>
            <p style="margin: 12px 0 0; color: #666; line-height: 1.6;">${profileDesc}</p>
          </div>

          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #EAEAEA; color: #666; font-size: 13px;">
            <p style="margin: 0;">Readiness level: <strong>${readiness}</strong></p>
            <p style="margin: 15px 0 0;">© 2026 Onimici. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    try {
      await transporter.sendMail({
        from: `"Onimici" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Your Onimici Relationship Profile',
        html: emailHtml,
      });
    } catch (emailError) {
      console.error('Email error:', emailError);
    }
  }

  return res.status(200).json({ ok: true });
}

async function handleWaitlist(params, res) {
  const { name, sex, email, country, city, profile, overall_score, readiness, ...questions } = params;

  // Check if already exists
  const { data: existing } = await supabase
    .from('waitlist')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    return res.status(400).json({ error: 'Email already on waitlist' });
  }

  const waitlistData = {
    name,
    sex,
    email,
    country,
    city,
    profile,
    overall_score: parseInt(overall_score),
    readiness,
    ...questions,
  };

  const { error: dbError } = await supabase
    .from('waitlist')
    .insert([waitlistData]);

  if (dbError) {
    console.error('Database error:', dbError);
    return res.status(500).json({ error: 'Failed to join waitlist' });
  }

  // Send email
  if (email) {
    const emailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #FF5A4E 0%, #E8463A 100%); color: white; padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="margin: 0; font-size: 28px;">✓ You're on the list.</h1>
            <p style="margin: 5px 0 0; opacity: 0.95;">Early access to Onimici</p>
          </div>

          <div style="background: white; border: 1px solid #EAEAEA; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 15px;">Hi ${name},</p>
            <p style="margin: 0 0 15px; color: #666; line-height: 1.6;">Thanks for taking the Onimici Compatibility Assessment. Your profile shows you're serious about finding a real, long-term relationship.</p>
            
            <div style="background: #FAFAFA; padding: 15px; border-left: 3px solid #FF5A4E; border-radius: 5px; margin: 15px 0;">
              <strong>Your Profile:</strong> ${profile}<br>
              <strong>Score:</strong> ${overall_score}/100<br>
              <p style="margin: 10px 0 0; font-size: 14px; color: #666;">You're ready for intentional connections with people who match your values and goals.</p>
            </div>

            <p style="margin: 15px 0 0; color: #666; line-height: 1.6;">We're inviting early members to help shape the future of relationship-first dating. You'll be among the first to receive access when we launch.</p>
          </div>

          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #EAEAEA; color: #666; font-size: 13px;">
            <p style="margin: 0;">© 2026 Onimici. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    try {
      await transporter.sendMail({
        from: `"Onimici" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Welcome to the Onimici Waitlist',
        html: emailHtml,
      });
    } catch (emailError) {
      console.error('Email error:', emailError);
    }
  }

  return res.status(200).json({ ok: true });
    }

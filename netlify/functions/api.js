require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const serverless = require('serverless-http');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// ── CONFIG ──────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tqaemkfvodaeauymsnno.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxYWVta2Z2b2RhZWF1eW1zbm5vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzcxNTA4OCwiZXhwIjoyMDg5MjkxMDg4fQ.ckMonviRgmgNcORiFBWC8NAmrFMFsyDi00AUQvG_Ssw';
const ADMIN_KEY = process.env.ADMIN_KEY || 'SkinAiSecretKey123451234512345';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());

// ── Static Files (Local Dev Only) ───────────────────────────
if (require.main === module || !process.env.NETLIFY) {
  app.use(express.static(path.join(__dirname, '../../public')));
}

// ── API ROUTES ───────────────────────────────────────────────

// 1. Get Signup Count
app.get('/api/waitlist/count', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase Count Error:', error);
      throw error;
    }
    res.json({ count: count || 0 });
  } catch (err) {
    console.error('API Count Error:', err.message);
    res.json({ count: 0, error: err.message });
  }
});

// 2. Submit Signup
app.post('/api/waitlist', async (req, res) => {
  const { email, name, source } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  console.log(`Signup attempt: ${email} (source: ${source})`);

  try {
    // Check if exists
    const { data: existing, error: checkError } = await supabase
      .from('waitlist')
      .select('position, tier')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows found"
      console.error('Supabase Check Error:', checkError);
      throw checkError;
    }

    if (existing) {
      console.log(`User already registered: ${email}`);
      return res.json({ 
        success: true, 
        position: existing.position, 
        tier: existing.tier, 
        message: 'already_registered' 
      });
    }

    // Insert new
    const { data, error: insertError } = await supabase
      .from('waitlist')
      .insert([{ 
        email: email.toLowerCase().trim(), 
        name: name || '', 
        source: source || 'website' 
      }])
      .select('position')
      .single();

    if (insertError) {
      console.error('Supabase Insert Error:', insertError);
      throw insertError;
    }

    console.log(`Successful signup: ${email}, position: ${data.position}`);

    // Get total count for real-time update
    const { count: total, error: countError } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    if (countError) console.error('Supabase Post-Signup Count Error:', countError);

    res.json({ success: true, position: data.position, total: total || 0 });
  } catch (err) {
    console.error('API Signup Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 3. Submit Contact Message
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required' });
  }

  console.log(`Contact message from: ${email}`);

  try {
    const { error } = await supabase
      .from('contact_messages')
      .insert([{ 
        name: name || '', 
        email: email.toLowerCase().trim(), 
        subject: subject || '', 
        message 
      }]);

    if (error) {
      console.error('Supabase Contact Error:', error);
      throw error;
    }

    res.json({ success: true, message: 'Message received' });
  } catch (err) {
    console.error('API Contact Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 4. Export Admin CSV
app.get('/api/waitlist/export', async (req, res) => {
  const key = req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data, error } = await supabase
      .from('waitlist')
      .select('position, email, name, created_at')
      .order('position', { ascending: true });

    if (error) throw error;

    const csv = [
      'position,email,name,created_at',
      ...data.map(r => `${r.position},${r.email},"${r.name || ''}",${r.created_at}`)
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="skinai-waitlist.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Stripe Checkout Session (Placeholder logic)
app.post('/api/checkout', async (req, res) => {
  const { email } = req.body;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId   = process.env.STRIPE_PRICE_ID;
  
  // ── Local Mock Mode ─────────────────────────────────────────
  // If NO keys are provided on localhost, return a mock success URL
  // so the user can see the flow work without a real Stripe account.
  if (!stripeKey && (require.main === module || !process.env.NETLIFY)) {
    console.warn('⚠️ STRIPE_SECRET_KEY missing. Returning mock checkout URL for local testing.');
    return res.json({ 
      url: `${process.env.URL || 'http://localhost:3001'}/success.html?mock=true`,
      message: 'Running in MOCK mode (no Stripe keys found)'
    });
  }

  if (!stripeKey) {
    return res.status(400).json({ error: 'Stripe is not configured yet. Please add STRIPE_SECRET_KEY to Netlify variables.' });
  }

  const stripe = require('stripe')(stripeKey);
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price: priceId || 'price_placeholder', // priceId is also required for real Stripe
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.URL || 'http://localhost:3001'}/success.html`,
      cancel_url: `${process.env.URL || 'http://localhost:3001'}/`,
      metadata: { email }
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports.app = app;
module.exports.handler = serverless(app);

// Local runner (for testing before you upload)
if (require.main === module) {
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`\n🚀 Skin AI Local Preview: http://localhost:${PORT}`);
    console.log(`\n(This mimics how Netlify will run your site)\n`);
  });
}

const API_BASE = ''

// Stores the email used for the current signup session
// so we can pass it to Stripe checkout without asking again
let sessionEmail = ''

// ── Nav scroll ───────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('nav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
})

// ── Event Listeners ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  document.getElementById('nav-btn')?.addEventListener('click', scrollToForm);
  document.getElementById('pricing-free-btn')?.addEventListener('click', scrollToForm);
  document.getElementById('pricing-premium-btn')?.addEventListener('click', scrollToForm);

  // Forms
  document.getElementById('hero-form')?.addEventListener('submit', (e) => submitWaitlist(e, 'hero'));
  document.getElementById('footer-form')?.addEventListener('submit', (e) => submitWaitlist(e, 'footer'));

  // Upsell buttons
  document.getElementById('hero-upsell-btn')?.addEventListener('click', () => startCheckout('hero'));
  document.getElementById('footer-upsell-btn')?.addEventListener('click', () => startCheckout('footer'));

  // Initial load
  document.getElementById('hero-left')?.classList.add('visible');
  fetchCount();
});

// ── Scroll to form ───────────────────────────────────────────
function scrollToForm() {
  const emailEl = document.getElementById('hero-email');
  if (emailEl) {
    emailEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => emailEl.focus(), 600);
  }
}

// ── Live signup count ────────────────────────────────────────
async function fetchCount() {
  try {
    const res  = await fetch(`${API_BASE}/api/waitlist/count`)
    const data = await res.json()
    if (data.count) {
      const el = document.getElementById('live-count')
      const proofEl = document.getElementById('hero-proof')
      
      if (el) el.textContent = data.count.toLocaleString()
      
      // Threshold check: Only show if 1000+ people
      if (data.count >= 1000) {
        if (proofEl) {
          proofEl.style.display = 'flex';
          setTimeout(() => proofEl.style.opacity = '1', 100);
        }
      } else {
        if (proofEl) proofEl.style.display = 'none';
      }

      if (el) {
        el.classList.add('updated')
        setTimeout(() => el.classList.remove('updated'), 1000)
      }
    }
  } catch (_) {}
}

// ── STEP 1: Email signup ─────────────────────────────────────
async function submitWaitlist(e, formId) {
  e.preventDefault()

  const isHero    = formId === 'hero'
  const emailEl   = document.getElementById(isHero ? 'hero-email' : 'footer-email')
  const nameEl    = document.getElementById('hero-name')
  const btn       = document.getElementById(isHero ? 'hero-btn' : 'footer-btn')
  const successEl = document.getElementById(isHero ? 'hero-success' : 'footer-success')
  const msgEl     = document.getElementById(isHero ? 'hero-success-msg' : 'footer-success-msg')
  const upsellEl  = document.getElementById(isHero ? 'hero-upsell' : 'footer-upsell')

  if (!emailEl || !btn) return

  const email = emailEl.value.trim()
  const name  = nameEl ? nameEl.value.trim() : ''
  if (!email) return

  sessionEmail = email  // store for Stripe checkout

  btn.disabled = true
  btn.classList.add('loading')
  const btnText = btn.querySelector('.btn-text')
  if (btnText) btnText.textContent = 'Joining...'

  try {
    const res  = await fetch(`${API_BASE}/api/waitlist`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, name, source: formId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Something went wrong')

    // ── Update button + show success wrapper ──
    btn.classList.remove('loading')
    if (btnText) btnText.textContent = "You're in ✓"
    btn.style.background = 'var(--sage)'

    // Confirmation message
    const alreadyIn = data.message === 'already_registered'
    if (msgEl) {
      msgEl.innerHTML = alreadyIn
        ? `<strong>You're already on the list</strong> — spot #${data.position?.toLocaleString()}. See you at launch.`
        : `<strong>You're in — spot #${data.position?.toLocaleString()}.</strong> We'll email you 48h before launch.`
    }

    // Show the upsell card (unless already premium)
    if (upsellEl && (!alreadyIn || data.tier !== 'premium')) {
      upsellEl.style.display = 'block'
    }

    if (successEl) successEl.style.display = 'block'

    if (isHero) {
      const proofEl = document.getElementById('hero-proof');
      if (proofEl) proofEl.style.display = 'none';
    }

    // Update live counter
    if (data.total) {
      const el = document.getElementById('live-count')
      const proofEl = document.getElementById('hero-proof')
      if (el) {
        el.textContent = data.total.toLocaleString()
        
        // Dynamic threshold check
        if (data.total >= 1000 && !isHeroSuccessVisible()) {
           if (proofEl) {
             proofEl.style.display = 'flex';
             setTimeout(() => proofEl.style.opacity = '1', 100);
           }
        }

        el.classList.add('updated')
        setTimeout(() => el.classList.remove('updated'), 1500)
      }
    }
  } catch (err) {
    btn.disabled = false
    btn.classList.remove('loading')
    if (btnText) btnText.textContent = 'Join →'
    showToast(err.message || 'Something went wrong. Try again.', true)
  }
}

// ── STEP 2: Stripe checkout ──────────────────────────────────
async function startCheckout(formId) {
  const isHero = formId === 'hero'
  const btn    = document.getElementById(isHero ? 'hero-upsell-btn' : 'footer-upsell-btn')

  if (!btn) return

  // Get email from session or re-read from input as fallback
  const email = sessionEmail
    || document.getElementById(isHero ? 'hero-email' : 'footer-email')?.value?.trim()

  if (!email) {
    showToast('Please enter your email first.', true)
    scrollToForm()
    return
  }

  btn.disabled = true
  btn.classList.add('loading')
  const btnText = btn.querySelector('.btn-text')
  if (btnText) btnText.textContent = 'Opening checkout...'

  try {
    const res  = await fetch(`${API_BASE}/api/checkout`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    })
    const data = await res.json()

    if (!res.ok) throw new Error(data.error || 'Could not start checkout')

    if (data.url) {
      // Redirect to Stripe Checkout
      window.location.href = data.url
    } else {
      throw new Error('No checkout URL returned')
    }

  } catch (err) {
    btn.disabled = false
    btn.classList.remove('loading')
    if (btnText) btnText.textContent = 'Reserve founding price →'
    showToast(err.message || 'Payment unavailable right now. Try again.', true)
  }
}

// ── Helper: Is success banner visible? ──
function isHeroSuccessVisible() {
  const el = document.getElementById('hero-success');
  return el && el.style.display === 'block';
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.getElementById('toast')
  if (!t) return;
  t.textContent = msg
  t.className   = `toast${isError ? ' error' : ''} show`
  setTimeout(() => t.classList.remove('show'), 3500)
}

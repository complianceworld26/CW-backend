import { Router } from 'express'

const router = Router()
const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send'

function buildTemplateParams(body, source) {
  const name = String(body?.name ?? '').trim()
  const email = String(body?.email ?? body?.from_email ?? '').trim()
  const phone = String(body?.phone ?? '').trim() || 'Not provided'
  const subjectRaw = String(body?.subject ?? '').trim()
  const message = String(body?.message ?? '').trim()
  const subject = subjectRaw || (source === 'order' ? 'Order form inquiry' : 'Contact form')

  return {
    name,
    from_name: name,
    user_name: name,
    email,
    from_email: email,
    user_email: email,
    reply_to: email,
    phone,
    phone_number: phone,
    subject,
    title: subject,
    message: source ? `[${source}] ${message}` : message,
    text: message,
  }
}

router.post('/', async (req, res) => {
  const serviceId = process.env.EMAILJS_SERVICE_ID
  const templateId = process.env.EMAILJS_TEMPLATE_ID
  const publicKey = process.env.EMAILJS_PUBLIC_KEY

  if (!serviceId || !templateId || !publicKey) {
    return res.status(503).json({
      code: 'contact/not-configured',
      message:
        'Email is not configured on the server. Set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY in backend .env (same values as your EmailJS dashboard / client env).',
    })
  }

  const source = String(req.body?.source ?? 'contact').trim() || 'contact'
  const name = String(req.body?.name ?? '').trim()
  const email = String(req.body?.email ?? req.body?.from_email ?? '').trim()
  const message = String(req.body?.message ?? '').trim()

  if (!name || !email || !message) {
    return res.status(400).json({
      code: 'contact/invalid-input',
      message: 'Name, email, and message are required.',
    })
  }

  const templateParams = buildTemplateParams(req.body, source)

  try {
    const r = await fetch(EMAILJS_SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lib_version: '4.4.1',
        user_id: publicKey,
        service_id: serviceId,
        template_id: templateId,
        template_params: templateParams,
      }),
    })

    const text = await r.text()
    if (!r.ok) {
      console.error('[contact] EmailJS HTTP', r.status, text)
      let msg = 'Email could not be sent.'
      try {
        const j = JSON.parse(text)
        msg = j.message || j.error || msg
      } catch {
        if (text) msg = text.length > 200 ? `${text.slice(0, 197)}…` : text
      }

      const nonBrowserBlocked = /non-browser environments is currently disabled/i.test(msg)
      if (nonBrowserBlocked) {
        return res.status(503).json({
          code: 'contact/emailjs-non-browser',
          message: msg,
          hint: 'https://dashboard.emailjs.com/admin/account/security',
        })
      }

      return res.status(502).json({ code: 'contact/send-failed', message: msg })
    }

    return res.json({ ok: true })
  } catch (err) {
    console.error('[contact] EmailJS fetch error:', err)
    return res.status(502).json({
      code: 'contact/send-failed',
      message: 'Could not reach the email service. Try again later.',
    })
  }
})

export default router

// Public endpoint for the contact and corporate quote forms.
// 1. validates + rate-limits the request, 2. stores the request in lead_submissions,
// 3. e-mails the owner (recipient comes from admin settings, never from the browser).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { CONTACT_SUBJECTS, resolveLeadRecipient, validateLead } from '../_shared/lead-validation.ts'

const ADMIN_LEADS_URL = 'https://gratisakademi.com/admin/leads'
const PER_EMAIL_LIMIT = 3 // requests per address per 10 minutes
const GLOBAL_LIMIT = 30 // requests per minute across the whole site

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Geçersiz istek.' }, 400)
  }

  // Honeypot: real visitors never fill the hidden "website" field.
  if (typeof body?.website === 'string' && body.website.trim() !== '') {
    return json({ ok: true })
  }

  const result = validateLead(body)
  if (!result.ok) return json({ error: result.error, field: result.field }, 400)
  const lead = result.lead

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    console.error('submit-lead: missing backend configuration')
    return json({ error: 'Sunucu yapılandırma hatası.' }, 500)
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // Rate limits
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
  const [perEmail, global] = await Promise.all([
    admin
      .from('lead_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('email', lead.email)
      .gte('created_at', tenMinutesAgo),
    admin
      .from('lead_submissions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneMinuteAgo),
  ])
  if (perEmail.error || global.error) {
    console.error('submit-lead: rate-limit check failed', perEmail.error ?? global.error)
    return json({ error: 'Talebiniz şu anda alınamadı. Lütfen tekrar deneyin.' }, 500)
  }
  if ((perEmail.count ?? 0) >= PER_EMAIL_LIMIT || (global.count ?? 0) >= GLOBAL_LIMIT) {
    return json(
      { error: 'Kısa sürede çok fazla talep gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.' },
      429,
    )
  }

  // Store first — the request is kept even if the e-mail cannot be sent.
  const { data: inserted, error: insertError } = await admin
    .from('lead_submissions')
    .insert({ ...lead, status: 'new' })
    .select('id, created_at')
    .single()
  if (insertError || !inserted) {
    console.error('submit-lead: insert failed', insertError)
    return json({ error: 'Talebiniz kaydedilemedi. Lütfen tekrar deneyin.' }, 500)
  }

  // Notify the owner
  let notificationStatus = 'failed'
  try {
    const { data: settingsRows, error: settingsError } = await admin
      .from('site_settings')
      .select('key, value')
      .in('key', ['notifications', 'quote_company'])
    if (settingsError) throw settingsError
    const settings = Object.fromEntries((settingsRows ?? []).map((r: any) => [r.key, r.value]))
    const recipient = resolveLeadRecipient(settings)

    if (recipient.status !== 'ok') {
      notificationStatus = recipient.status
    } else {
      const submittedAt = new Date(inserted.created_at).toLocaleString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      const sendResult = await sendTemplateEmail('lead-notification', recipient.email, {
        templateData: {
          source: lead.source,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          companyName: lead.company_name,
          employeeCount: lead.employee_count,
          subjectLabel: lead.subject ? CONTACT_SUBJECTS[lead.subject] ?? lead.subject : null,
          message: lead.message,
          submittedAt,
          adminUrl: ADMIN_LEADS_URL,
        },
        idempotencyKey: `lead-notification-${inserted.id}`,
        replyTo: lead.email,
      })
      notificationStatus = sendResult.sent ? 'sent' : 'suppressed'
    }
  } catch (error) {
    console.error('submit-lead: owner notification failed', error)
    notificationStatus = 'failed'
  }

  const { error: updateError } = await admin
    .from('lead_submissions')
    .update({
      notification_status: notificationStatus,
      notified_at: notificationStatus === 'sent' ? new Date().toISOString() : null,
    })
    .eq('id', inserted.id)
  if (updateError) console.error('submit-lead: could not record notification status', updateError)

  return json({ ok: true, id: inserted.id })
})

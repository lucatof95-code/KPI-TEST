import nodemailer from 'nodemailer'
import { prisma } from './prisma'

export interface SmtpSettings {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  fromName: string
  fromEmail: string
  appUrl: string
}

export async function loadSettings(): Promise<SmtpSettings> {
  const rows = await prisma.setting.findMany()
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return {
    host: map.smtp_host || '',
    port: parseInt(map.smtp_port || '587'),
    secure: map.smtp_secure === 'true',
    user: map.smtp_user || '',
    pass: map.smtp_pass || '',
    fromName: map.smtp_from_name || 'KPI Formazione ERP',
    fromEmail: map.smtp_from_email || map.smtp_user || '',
    appUrl: map.app_url || 'http://localhost:5173',
  }
}

export async function sendMail(options: {
  to: string
  subject: string
  html: string
  text: string
  icsAttachment?: string
}) {
  const cfg = await loadSettings()
  const from = `"${cfg.fromName}" <${cfg.fromEmail}>`

  if (!cfg.host || !cfg.user || !cfg.pass) {
    console.log('\n📧 [MAIL DEV — SMTP non configurato] ─────────────────')
    console.log(`  From:    ${from}`)
    console.log(`  To:      ${options.to}`)
    console.log(`  Subject: ${options.subject}`)
    console.log(`  Body:\n${options.text}`)
    if (options.icsAttachment) console.log('  [allegato .ics presente]')
    console.log('────────────────────────────────────────────────────\n')
    return { messageId: 'dev-console' }
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  })

  const attachments = options.icsAttachment
    ? [
        {
          filename: 'formazione.ics',
          content: options.icsAttachment,
          contentType: 'text/calendar; method=REQUEST; charset=UTF-8',
          contentDisposition: 'inline' as const,
        },
      ]
    : []

  return transporter.sendMail({ from, to: options.to, subject: options.subject, html: options.html, text: options.text, attachments })
}

// ─── ICS calendar invite ───────────────────────────────────────────────────

export interface CalendarEvent {
  title: string
  description: string
  location?: string
  start: Date
  end: Date
  organizerName: string
  organizerEmail: string
}

function fmtDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

export function generateICS(event: CalendarEvent): string {
  const uid = `kpi-${Date.now()}-${Math.random().toString(36).slice(2)}@kpi.test`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KPI Formazione ERP//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmtDate(new Date())}`,
    `DTSTART:${fmtDate(event.start)}`,
    `DTEND:${fmtDate(event.end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    event.location ? `LOCATION:${event.location}` : '',
    `ORGANIZER;CN="${event.organizerName}":mailto:${event.organizerEmail}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)
  return lines.join('\r\n')
}

// ─── Email template ────────────────────────────────────────────────────────

export function buildNotificationEmail(
  nome: string,
  cognome: string,
  counts: { formazione: number; test: number },
  appUrl: string,
  pmName: string,
): { subject: string; html: string; text: string } {
  const total = counts.formazione + counts.test
  const subject = `Hai ${total === 1 ? 'una nuova attività' : `${total} nuove attività`} da svolgere`

  const parts: string[] = []
  if (counts.formazione > 0)
    parts.push(`${counts.formazione} di <strong>formazione</strong>`)
  if (counts.test > 0)
    parts.push(`${counts.test} di <strong>test</strong>`)
  const detailLine = parts.join(' e ')

  const html = `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <tr>
          <td style="background:#1d4ed8;padding:24px 32px">
            <p style="margin:0;color:#bfdbfe;font-size:12px;letter-spacing:.05em;text-transform:uppercase">KPI Formazione ERP</p>
            <h1 style="margin:4px 0 0;color:#fff;font-size:20px;font-weight:700">Nuove attività assegnate</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 12px;color:#374151;font-size:15px">Ciao <strong>${nome} ${cognome}</strong>,</p>
            <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.7">
              hai ${total === 1 ? 'una nuova attività assegnata' : `<strong>${total} nuove attività assegnate</strong>`}
              sul nuovo gestionale ERP: ${detailLine}.
            </p>
            <p style="margin:0 0 28px;color:#4b5563;font-size:14px;line-height:1.7">
              Accedi alla piattaforma per visualizzare i dettagli e completarle entro le scadenze previste.
            </p>
            <div style="text-align:center">
              <a href="${appUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600">
                Vai alle attività →
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 20px;border-top:1px solid #f3f4f6">
            <p style="margin:0;color:#6b7280;font-size:13px">${pmName}</p>
            <p style="margin:4px 0 0;color:#9ca3af;font-size:11px">Questa email è stata inviata automaticamente dal sistema KPI Formazione ERP.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = [
    `Ciao ${nome} ${cognome},`,
    '',
    `hai ${total} nuova/e attività assegnata/e sul nuovo gestionale ERP:`,
    counts.formazione > 0 ? `  - ${counts.formazione} di formazione` : '',
    counts.test > 0 ? `  - ${counts.test} di test` : '',
    '',
    `Accedi alla piattaforma: ${appUrl}`,
    '',
    pmName,
  ].filter((l) => l !== undefined && !(l === '' && false)).join('\n')

  return { subject, html, text }
}

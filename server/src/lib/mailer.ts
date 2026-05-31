import nodemailer from 'nodemailer'

const isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

export const transporter = isConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null

export async function sendMail(options: { to: string; subject: string; html: string; text: string }) {
  if (!transporter) {
    // Dev fallback: log to console instead of sending
    console.log('\n📧 [MAIL DEV] ─────────────────────────────')
    console.log(`  To:      ${options.to}`)
    console.log(`  Subject: ${options.subject}`)
    console.log(`  Body:\n${options.text}`)
    console.log('─────────────────────────────────────────\n')
    return { messageId: 'dev-console' }
  }
  return transporter.sendMail({
    from: process.env.SMTP_FROM || `"KPI Formazione ERP" <${process.env.SMTP_USER}>`,
    ...options,
  })
}

export function buildAssignmentEmail(
  nome: string,
  cognome: string,
  assignments: { nome: string; tipo: string; sessione: string; scadenza: string; descrizione: string }[],
  appUrl: string,
): { subject: string; html: string; text: string } {
  const subject = `Nuove attività di formazione assegnate (${assignments.length})`

  const rows = assignments
    .map(
      (a, i) => `
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:12px 8px;color:#6b7280;font-size:13px;vertical-align:top">${i + 1}.</td>
        <td style="padding:12px 8px;vertical-align:top">
          <strong style="color:#111827;font-size:14px">${a.nome}</strong>
          <p style="margin:4px 0 0;color:#6b7280;font-size:13px">${a.descrizione}</p>
          <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">
            <span style="background:${a.tipo === 'FORMAZIONE' ? '#dbeafe' : '#ede9fe'};color:${a.tipo === 'FORMAZIONE' ? '#1d4ed8' : '#7c3aed'};padding:2px 8px;border-radius:99px;font-size:12px;font-weight:500">${a.tipo}</span>
            <span style="background:#f3f4f6;color:#374151;padding:2px 8px;border-radius:99px;font-size:12px">${a.sessione}</span>
          </div>
        </td>
        <td style="padding:12px 8px;white-space:nowrap;font-size:13px;color:${new Date(a.scadenza) < new Date() ? '#dc2626' : '#374151'};vertical-align:top">
          📅 ${a.scadenza}
        </td>
      </tr>`,
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <!-- Header -->
        <tr>
          <td style="background:#1d4ed8;padding:24px 32px">
            <p style="margin:0;color:#bfdbfe;font-size:12px;font-weight:500;letter-spacing:0.05em;text-transform:uppercase">KPI Formazione ERP</p>
            <h1 style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:700">Nuove attività assegnate</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:28px 32px">
            <p style="margin:0 0 8px;color:#374151;font-size:15px">Ciao <strong>${nome} ${cognome}</strong>,</p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">
              ti ${assignments.length === 1 ? 'è stata assegnata <strong>1 nuova attività</strong>' : `sono state assegnate <strong>${assignments.length} nuove attività</strong>`}
              di formazione sul nuovo gestionale ERP. Accedi all'app per consultare i dettagli e inviare il tuo report al completamento.
            </p>
            <!-- Table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:collapse;overflow:hidden">
              <thead>
                <tr style="background:#f9fafb">
                  <th style="padding:10px 8px;text-align:left;color:#6b7280;font-size:12px;font-weight:500;width:24px">#</th>
                  <th style="padding:10px 8px;text-align:left;color:#6b7280;font-size:12px;font-weight:500">Attività</th>
                  <th style="padding:10px 8px;text-align:left;color:#6b7280;font-size:12px;font-weight:500">Scadenza</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <!-- CTA -->
            <div style="margin-top:28px;text-align:center">
              <a href="${appUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
                Accedi all'app →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f3f4f6;background:#f9fafb">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center">
              Questa email è stata inviata dal sistema KPI Formazione ERP.<br>Non rispondere a questa email.
            </p>
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
    `ti ${assignments.length === 1 ? 'è stata assegnata 1 nuova attività' : `sono state assegnate ${assignments.length} nuove attività`} di formazione sul nuovo gestionale ERP.`,
    '',
    ...assignments.map((a, i) => [
      `${i + 1}. ${a.nome}`,
      `   Tipo: ${a.tipo}  |  Sessione: ${a.sessione}  |  Scadenza: ${a.scadenza}`,
      `   ${a.descrizione}`,
    ].join('\n')),
    '',
    `Accedi all'app: ${appUrl}`,
    '',
    'Il team KPI Formazione ERP',
  ].join('\n')

  return { subject, html, text }
}

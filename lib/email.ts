/**
 * Invio email transazionali tramite Resend (https://resend.com).
 *
 * Configurazione (variabili d'ambiente):
 *   RESEND_API_KEY  — chiave API Resend. Se ASSENTE, l'email non parte e la
 *                     funzione lo segnala: chi chiama può ripiegare su un
 *                     link da copiare a mano (es. invito via WhatsApp).
 *   EMAIL_FROM      — mittente. Finché il dominio noidemoliamo.it non è
 *                     verificato su Resend si usa il mittente di test
 *                     (onboarding@resend.dev: consegna SOLO all'email
 *                     dell'account Resend).
 */

interface ParametriEmail {
  a: string
  oggetto: string
  html: string
}

export async function inviaEmail({ a, oggetto, html }: ParametriEmail): Promise<{ inviata: boolean; errore?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { inviata: false, errore: 'RESEND_API_KEY non configurata' }
  }
  const from = process.env.EMAIL_FROM || 'NoiDemoliamo <onboarding@resend.dev>'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [a], subject: oggetto, html }),
    })
    if (!res.ok) {
      const dettaglio = await res.text().catch(() => '')
      return { inviata: false, errore: `Resend HTTP ${res.status}: ${dettaglio}` }
    }
    return { inviata: true }
  } catch (err) {
    return { inviata: false, errore: err instanceof Error ? err.message : 'Errore di rete' }
  }
}

/**
 * Template base delle email NoiDemoliamo: header blu, contenuto, bottone.
 * Tabelle e stili inline per compatibilità con tutti i client di posta.
 */
export function templateEmail({ titolo, corpo, bottoneTesto, bottoneUrl }: {
  titolo: string
  corpo: string
  bottoneTesto?: string
  bottoneUrl?: string
}): string {
  const bottone = bottoneTesto && bottoneUrl
    ? `<tr><td align="center" style="padding:8px 32px 28px;">
         <a href="${bottoneUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 34px;border-radius:12px;font-family:Arial,Helvetica,sans-serif;">${bottoneTesto}</a>
       </td></tr>`
    : ''
  return `<!doctype html>
<html lang="it"><body style="margin:0;padding:0;background:#eef1f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f7;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
  <tr><td style="background:#1d4ed8;padding:18px 32px;">
    <span style="color:#ffffff;font-size:17px;font-weight:700;font-family:Arial,Helvetica,sans-serif;">NoiDemoliamo</span>
  </td></tr>
  <tr><td style="padding:28px 32px 8px;">
    <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">${titolo}</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#374151;font-family:Arial,Helvetica,sans-serif;">${corpo}</p>
  </td></tr>
  ${bottone}
  <tr><td style="padding:14px 32px 22px;border-top:1px solid #f3f4f6;">
    <p style="margin:0;font-size:11px;color:#9aa7b5;font-family:Arial,Helvetica,sans-serif;">NoiDemoliamo · Demolizione auto gratuita in tutta Italia</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

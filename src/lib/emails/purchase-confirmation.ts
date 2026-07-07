export function buildPurchaseConfirmationEmail(params: {
  productName: string;
  customerEmail: string;
  actionUrl: string;
}): string {
  const { productName, customerEmail, actionUrl } = params;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Confirmação de compra — Andromeda Play</title></head>
<body style="margin:0; padding:0; background-color:#0a0a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a1a; padding: 32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color:#12121f; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden;">
        <tr><td align="center" style="padding: 36px 32px 20px 32px; background-color:#000000;">
          <img src="data:image/jpeg;base64,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" alt="Andromeda Play" width="220" style="display:block; max-width:220px; height:auto; border:0;" />
        </td></tr>
        <tr><td align="center" style="padding: 0 32px 8px 32px;">
          <span style="display:inline-block; background-color: rgba(34,197,94,0.12); color:#4ade80; font-size:12px; font-weight:700; letter-spacing:0.5px; padding:6px 14px; border-radius:999px;">COMPRA CONFIRMADA</span>
        </td></tr>
        <tr><td align="center" style="padding: 12px 32px 0 32px;">
          <h1 style="margin:0; font-size: 24px; line-height: 1.3; color:#ffffff; font-weight: 800;">Bem-vindo(a) à sua jornada!</h1>
        </td></tr>
        <tr><td style="padding: 16px 32px 0 32px;">
          <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#c7c7d6;">Olá! Sua compra de <strong style="color:#ffffff;">${productName}</strong> foi confirmada com sucesso. 🎉</p>
          <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#c7c7d6;">Para acessar o conteúdo, você precisa criar sua conta na Andromeda Play, usando <strong style="color:#ffffff;">o mesmo e-mail que você usou na compra</strong> (<span style="color:#ffffff;">${customerEmail}</span>).</p>
        </td></tr>
        <tr><td align="center" style="padding: 24px 32px;">
          <a href="${actionUrl}" style="display:inline-block; background: linear-gradient(90deg,#4f46e5,#a855f7); color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; padding:14px 32px; border-radius:10px;">Criar conta e acessar →</a>
        </td></tr>
        <tr><td style="padding: 8px 32px 0 32px;">
          <p style="margin:0 0 10px 0; font-size:13px; font-weight:700; color:#8b8ba0; text-transform:uppercase; letter-spacing:0.5px;">Como funciona a partir daqui</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:6px 0; font-size:14px; color:#c7c7d6; line-height:1.5;">1. Clique no botão acima e escolha sua senha</td></tr>
            <tr><td style="padding:6px 0; font-size:14px; color:#c7c7d6; line-height:1.5;">2. Você será direcionado direto para <strong style="color:#ffffff;">${productName}</strong></td></tr>
            <tr><td style="padding:6px 0; font-size:14px; color:#c7c7d6; line-height:1.5;">3. Pronto — é só começar a assistir</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding: 24px 32px 0 32px;">
          <p style="margin:0; font-size:12px; line-height:1.6; color:#6b6b80;">Se o botão não funcionar, copie e cole este link no seu navegador:<br /><a href="${actionUrl}" style="color:#a855f7; word-break:break-all;">${actionUrl}</a></p>
        </td></tr>
        <tr><td style="padding: 28px 32px 0 32px;"><div style="height:1px; background-color:rgba(255,255,255,0.08);"></div></td></tr>
        <tr><td align="center" style="padding: 20px 32px 32px 32px;">
          <p style="margin:0; font-size:12px; color:#6b6b80; line-height:1.6;">Dúvidas? É só responder este e-mail.<br />© Andromeda Play — Este link de acesso expira em 24 horas por segurança.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

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
          <h2 style="margin:0; color:#ffffff; font-size:22px; font-weight:800; letter-spacing:2px;">ANDROMEDA PLAY</h2>
        </td></tr>
        <tr><td align="center" style="padding: 20px 32px 8px 32px;">
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

export function escapeEmail(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function emailCodeBox(code: string): string {
  return `<table role="presentation" align="center" width="288" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:288px;margin:28px auto"><tr><td align="center" bgcolor="#151e17" style="border:1px solid #334638;border-radius:8px;padding:22px 12px"><p class="otp-digits" style="margin:0;padding-left:10px;font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:700;line-height:48px;letter-spacing:10px;color:#eaf5e8">${escapeEmail(code)}</p></td></tr></table>`;
}

/** HTML fragments must be trusted template markup, with dynamic user content escaped. */
export function emailLayout({ language, titleHtml, bodyHtml, footerHtml, bannerUrl, homeUrl, align = "left" }: {
  language: "en" | "id";
  titleHtml: string;
  bodyHtml: string;
  footerHtml: string;
  bannerUrl: string;
  homeUrl: string;
  align?: "left" | "center";
}): string {
  return `<!doctype html>
<html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><style>@media only screen and (max-width:480px){.email-body{padding:28px 20px!important}.email-title{font-size:24px!important}.email-footer{padding:22px 20px!important}.otp-digits{font-size:32px!important;letter-spacing:8px!important;padding-left:8px!important}}</style></head>
<body style="margin:0;padding:24px 12px;background:#080d0a;color:#eaf5e8;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#101712" style="width:100%;max-width:600px;margin:0 auto;background:#101712;border:1px solid #233027;border-radius:10px;overflow:hidden">
<tr><td style="padding:0;font-size:0;line-height:0"><img src="${escapeEmail(bannerUrl)}" width="600" height="316" alt="Scratch Agent — From ideas to execution" style="display:block;width:100%;max-width:600px;height:auto;border:0;color:#eaf5e8;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:28px"></td></tr>
<tr><td class="email-body" align="${align}" style="padding:36px 36px 32px;text-align:${align}"><h1 class="email-title" style="margin:0 0 16px;color:#eaf5e8;font-size:26px;font-weight:600;line-height:1.3;letter-spacing:-0.5px">${titleHtml}</h1>${bodyHtml}</td></tr>
<tr><td class="email-footer" align="center" style="padding:24px 36px;border-top:1px solid #28352c;text-align:center"><p style="margin:0 0 10px;color:#93a297;font-size:12px;line-height:1.7">${footerHtml}</p><a href="${escapeEmail(homeUrl)}" style="color:#c5d4c8;font-size:12px;line-height:1.7;text-decoration:none">Scratch Agent</a></td></tr>
</table></td></tr></table></body></html>`;
}

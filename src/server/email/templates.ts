import type { MailMessage } from "./mailer";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function layout(
  heading: string,
  body: string,
  actionLabel: string,
  actionUrl: string,
) {
  const url = escapeHtml(actionUrl);
  return `<!doctype html><html><body style="margin:0;background:#F7F7F5;font-family:Inter,Arial,sans-serif;color:#16161A">
<div style="max-width:480px;margin:0 auto;padding:32px 16px">
<div style="background:#FFFFFF;border:1px solid #E6E6E1;border-radius:16px;padding:28px">
<h1 style="font-size:20px;line-height:28px;margin:0 0 12px">${escapeHtml(heading)}</h1>
<p style="font-size:15px;line-height:24px;color:#5F5F6B;margin:0 0 24px">${escapeHtml(body)}</p>
<a href="${url}" style="display:inline-block;background:#3B5BFD;color:#FFFFFF;text-decoration:none;font-weight:500;padding:12px 20px;border-radius:12px">${escapeHtml(actionLabel)}</a>
<p style="font-size:13px;line-height:20px;color:#9A9AA3;margin:24px 0 0;word-break:break-all">Or paste this link into your browser: ${url}</p>
</div></div></body></html>`;
}

export function verificationEmail(
  to: string,
  name: string,
  url: string,
): MailMessage {
  const body = `Hi ${name}, confirm your email to start building your study plan. The link works for 24 hours.`;
  return {
    to,
    subject: "Verify your email",
    text: `${body}\n\n${url}`,
    html: layout("Verify your email", body, "Verify email", url),
  };
}

export function passwordResetEmail(
  to: string,
  name: string,
  url: string,
): MailMessage {
  const body = `Hi ${name}, use this link to choose a new password. It works for 1 hour. If you didn't ask for this, ignore this email; your password stays the same.`;
  return {
    to,
    subject: "Reset your password",
    text: `${body}\n\n${url}`,
    html: layout("Reset your password", body, "Choose a new password", url),
  };
}

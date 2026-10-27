import nodemailer from "nodemailer";

interface SendOptions {
  to: string;
  subject: string;
  html: string;
}

function isEmailEnabled() {
  return process.env.EMAIL_ENABLED === "true";
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * Send an email. NEVER throws — failures are logged only, so a request is
 * never failed by an email problem. Honors EMAIL_ENABLED.
 */
export async function sendEmail({ to, subject, html }: SendOptions) {
  if (!isEmailEnabled()) {
    console.log("EMAIL_DISABLED", { to, subject });
    return { sent: false, reason: "EMAIL_DISABLED" };
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.log("EMAIL_NOT_CONFIGURED", { to, subject });
    return { sent: false, reason: "NOT_CONFIGURED" };
  }

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    console.log("EMAIL_SENT", { to, subject });
    return { sent: true };
  } catch (err) {
    console.error("EMAIL_FAILED", { to, subject, error: err instanceof Error ? err.message : err });
    return { sent: false, reason: "FAILED" };
  }
}

const wrap = (title: string, body: string, buttonText?: string, buttonUrl?: string) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0b1220;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" style="max-width:520px;background:#131c2e;border:1px solid #243047;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:24px 28px;">
          <div style="font-size:18px;font-weight:bold;color:#f59e0b;margin-bottom:4px;">Taskora</div>
          <h1 style="font-size:20px;color:#e5e9f0;margin:16px 0 8px;">${title}</h1>
          <div style="font-size:14px;color:#9aa7bd;line-height:1.6;">${body}</div>
          ${
            buttonText && buttonUrl
              ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr>
                   <td style="background:#f59e0b;border-radius:8px;">
                     <a href="${buttonUrl}" style="display:inline-block;padding:12px 20px;color:#0b1220;font-weight:bold;text-decoration:none;">${buttonText}</a>
                   </td>
                 </tr></table>`
              : ""
          }
        </td></tr>
        <tr><td style="padding:14px 28px;border-top:1px solid #243047;font-size:11px;color:#66748c;">
          You received this email because you have a Taskora account.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export function assignmentEmail(opts: {
  assigneeName: string;
  taskTitle: string;
  priority: string;
  dueAt?: string | null;
  project?: string | null;
  taskUrl: string;
}) {
  const due = opts.dueAt ? new Date(opts.dueAt).toLocaleString() : "No deadline";
  return {
    subject: `You've been assigned: ${opts.taskTitle}`,
    html: wrap(
      "You've been assigned a task",
      `<p>Hi ${opts.assigneeName},</p>
       <p><strong style="color:#e5e9f0;">${opts.taskTitle}</strong> has been assigned to you.</p>
       <p style="margin-top:12px;">
         <span style="color:#66748c;">Priority:</span> <strong>${opts.priority}</strong><br/>
         <span style="color:#66748c;">Due:</span> <strong>${due}</strong><br/>
         <span style="color:#66748c;">Project:</span> <strong>${opts.project || "Standalone task"}</strong>
       </p>`,
      "View task",
      opts.taskUrl
    ),
  };
}

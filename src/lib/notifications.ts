/**
 * Notification dispatch via Twilio (SMS) and SendGrid (email).
 *
 * Both providers no-op (and log) when their env vars are unset, so the
 * app boots cleanly without keys configured. Replace these with real
 * implementations or leave them — the call sites stay the same.
 */

import sgMail from "@sendgrid/mail";
import twilio from "twilio";

interface SmsArgs {
  to: string;
  body: string;
}

interface EmailArgs {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

let sendgridReady = false;
function ensureSendgrid(): boolean {
  if (sendgridReady) return true;
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return false;
  sgMail.setApiKey(key);
  sendgridReady = true;
  return true;
}

let twilioClient: twilio.Twilio | null = null;
function ensureTwilio(): twilio.Twilio | null {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  twilioClient = twilio(sid, token);
  return twilioClient;
}

export async function sendSms({ to, body }: SmsArgs): Promise<void> {
  const client = ensureTwilio();
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!client || !from) {
    console.info("[sms:disabled]", to, body.slice(0, 80));
    return;
  }
  if (!to) return;
  try {
    await client.messages.create({ to, from, body });
  } catch (err) {
    console.error("[sms:error]", err);
  }
}

export async function sendEmail({ to, subject, text, html }: EmailArgs): Promise<void> {
  if (!ensureSendgrid()) {
    console.info("[email:disabled]", Array.isArray(to) ? to.join(",") : to, subject);
    return;
  }
  const from = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME || "Local Delivery Co.";
  if (!from) {
    console.info("[email:disabled:no-from]", subject);
    return;
  }
  try {
    await sgMail.send({
      to,
      from: { email: from, name: fromName },
      subject,
      text,
      html: html ?? `<pre style="font-family:system-ui,sans-serif">${escapeHtml(text)}</pre>`
    });
  } catch (err) {
    console.error("[email:error]", err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── high-level helpers ─────────────────────────────────────────────

export async function notifySignupConfirmation(opts: { email: string; firstName?: string | null }) {
  await sendEmail({
    to: opts.email,
    subject: "We received your registration",
    text: `Hi ${opts.firstName ?? "there"},\n\nThanks for registering. An admin will review your account shortly. You'll get another email when it's approved.\n\n— ${process.env.NEXT_PUBLIC_BRAND_NAME ?? "Local Delivery Co."}`
  });
}

export async function notifyApproval(opts: { email: string; phone?: string | null; firstName?: string | null }) {
  await sendEmail({
    to: opts.email,
    subject: "Your account is active",
    text: `Hi ${opts.firstName ?? "there"},\n\nYour account has been approved. You can now sign in and place orders.\n\n— ${process.env.NEXT_PUBLIC_BRAND_NAME ?? "Local Delivery Co."}`
  });
  if (opts.phone) {
    await sendSms({ to: opts.phone, body: "Your account is now active. You can sign in and start ordering." });
  }
}

export async function notifyOrderConfirmation(opts: {
  email: string;
  phone?: string | null;
  firstName?: string | null;
  orderId: string;
  totalCents: number;
}) {
  const dollars = (opts.totalCents / 100).toFixed(2);
  await sendEmail({
    to: opts.email,
    subject: `Order confirmation #${opts.orderId.slice(0, 8)}`,
    text: `Hi ${opts.firstName ?? "there"},\n\nWe received your order. Total: $${dollars}.\n\nYou can view it any time in your account.\n\n— ${process.env.NEXT_PUBLIC_BRAND_NAME ?? "Local Delivery Co."}`
  });
  if (opts.phone) {
    await sendSms({ to: opts.phone, body: `Order received. Total $${dollars}. Ref ${opts.orderId.slice(0, 8)}.` });
  }
}

export async function notifyOrderStatus(opts: {
  email: string;
  phone?: string | null;
  firstName?: string | null;
  orderId: string;
  status: string;
}) {
  const label = statusLabel(opts.status);
  await sendEmail({
    to: opts.email,
    subject: `Order ${opts.orderId.slice(0, 8)} — ${label}`,
    text: `Hi ${opts.firstName ?? "there"},\n\nYour order status is now: ${label}.\n\n— ${process.env.NEXT_PUBLIC_BRAND_NAME ?? "Local Delivery Co."}`
  });
  if (opts.phone) {
    await sendSms({ to: opts.phone, body: `Order ${opts.orderId.slice(0, 8)}: ${label}` });
  }
}

export async function notifyAdminNewOrder(opts: { orderId: string; totalCents: number; fulfillment: string }) {
  const adminEmails = (process.env.ADMIN_ALERT_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const adminPhones = (process.env.ADMIN_ALERT_PHONES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const dollars = (opts.totalCents / 100).toFixed(2);
  const summary = `New ${opts.fulfillment} order ${opts.orderId.slice(0, 8)} — $${dollars}`;
  if (adminEmails.length) {
    await sendEmail({ to: adminEmails, subject: summary, text: summary });
  }
  for (const phone of adminPhones) {
    await sendSms({ to: phone, body: summary });
  }
}

export async function notifyAdminNewAccount(opts: { email: string; firstName?: string | null; lastName?: string | null }) {
  const adminEmails = (process.env.ADMIN_ALERT_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!adminEmails.length) return;
  const name = [opts.firstName, opts.lastName].filter(Boolean).join(" ") || opts.email;
  await sendEmail({
    to: adminEmails,
    subject: "New account awaiting approval",
    text: `${name} (${opts.email}) registered and is pending approval.`
  });
}

function statusLabel(s: string): string {
  switch (s) {
    case "received": return "Received";
    case "packed": return "Packed";
    case "out_for_delivery": return "Out for delivery";
    case "delivered": return "Delivered";
    case "cancelled": return "Cancelled";
    default: return s;
  }
}

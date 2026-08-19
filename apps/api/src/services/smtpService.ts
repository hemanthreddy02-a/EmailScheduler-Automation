/**
 * Nodemailer SMTP service using Ethereal for test email delivery.
 *
 * Ethereal is a fake SMTP service that catches emails and provides
 * a preview URL — no emails are actually delivered to recipients.
 * This is perfect for development and testing.
 *
 * In production, swap Ethereal credentials for a real SMTP provider
 * (e.g., SendGrid, SES, Postmark).
 */

import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer/index.js";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

interface SendEmailOptions {
  from: string;
  to: string;
  subject: string;
  body: string;
}

interface SendEmailResult {
  messageId: string;
  previewUrl?: string;
}

let cachedTransporter: nodemailer.Transporter | null = null;

/**
 * Returns or creates the Nodemailer transporter.
 * If ETHEREAL_USER is not set, auto-creates a test account.
 */
async function getTransporter(): Promise<nodemailer.Transporter> {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (config.ethereal.user && config.ethereal.password) {
    // Use provided credentials
    cachedTransporter = nodemailer.createTransport({
      host: config.ethereal.host,
      port: config.ethereal.port,
      secure: false,
      auth: {
        user: config.ethereal.user,
        pass: config.ethereal.password,
      },
    });

    logger.info(
      { host: config.ethereal.host, user: config.ethereal.user },
      "SMTP transporter created with provided Ethereal credentials"
    );
  } else {
    // Auto-create a test Ethereal account
    logger.info("Auto-creating Ethereal test account...");
    const testAccount = await nodemailer.createTestAccount();

    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    logger.info(
      { user: testAccount.user },
      "SMTP transporter created with auto-generated Ethereal account"
    );
  }

  // Verify the connection
  try {
    await cachedTransporter.verify();
    logger.info("SMTP connection verified successfully");
  } catch (err) {
    logger.warn({ err }, "SMTP verification failed — emails may not send");
  }

  return cachedTransporter;
}

export async function sendEmail(
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const transporter = await getTransporter();

  const mailOptions: Mail.Options = {
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.body,
    text: options.body.replace(/<[^>]*>/g, ""), // Plain text fallback
  };

  const info = await transporter.sendMail(mailOptions);

  // Get Ethereal preview URL if available
  const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;

  if (previewUrl) {
    logger.info(
      { messageId: info.messageId, previewUrl, to: options.to },
      "Email sent — view at Ethereal preview URL"
    );
  } else {
    logger.info(
      { messageId: info.messageId, to: options.to },
      "Email sent"
    );
  }

  return {
    messageId: info.messageId,
    previewUrl: typeof previewUrl === "string" ? previewUrl : undefined,
  };
}

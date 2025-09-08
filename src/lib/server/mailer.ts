import "server-only";
import nodemailer from "nodemailer";

let cachedTransport: nodemailer.Transporter | null = null;

export function getTransport() {
  if (cachedTransport) return cachedTransport;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) throw new Error("EMAIL_USER/PASS are not set");
  cachedTransport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cachedTransport;
}

export async function sendOtpMail(to: string, otp: string) {
  const transporter = getTransport();
  const from = process.env.EMAIL_USER!;
  const info = await transporter.sendMail({
    from: `AgriSense <${from}>`,
    to,
    subject: "Your AgriSense verification code",
    text: `Your verification code is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your verification code is <b>${otp}</b>. It expires in 10 minutes.</p>`,
  });
  return info.messageId;
}



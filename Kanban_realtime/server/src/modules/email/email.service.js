const nodemailer = require('nodemailer');
const env = require('../../config/env');

class EmailService {
  constructor() {
    this._transporter = null;
  }

  _getTransporter() {
    if (!env.SMTP_HOST) return null;
    if (!this._transporter) {
      this._transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      });
    }
    return this._transporter;
  }

  async sendMentionEmail({ toEmail, toName, mentionedBy, cardTitle, boardName, commentContent }) {
    const transporter = this._getTransporter();
    if (!transporter) return; // SMTP não configurado — skip silencioso

    const preview = commentContent.replace(/@\[([^\]]+)\]/g, '@...').slice(0, 200);

    await transporter.sendMail({
      from: `"Kanban Realtime" <${env.SMTP_FROM}>`,
      to: `"${toName}" <${toEmail}>`,
      subject: `${mentionedBy} mencionou você no card "${cardTitle}"`,
      text: `${mentionedBy} mencionou você em ${boardName} — card "${cardTitle}":\n\n${preview}`,
      html: `
        <p><strong>${mentionedBy}</strong> mencionou você no card <strong>"${cardTitle}"</strong> (${boardName}):</p>
        <blockquote style="border-left:3px solid #6366f1;padding:8px 16px;color:#555">${preview}</blockquote>
      `,
    });
  }
}

module.exports = new EmailService();

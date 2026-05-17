const nodemailer = require('nodemailer');
const crypto = require('crypto');
const prisma = require('../../config/database');
const env = require('../../config/env');

const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hora

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

  // ── Rate limiting via EmailLog ─────────────────────────────
  async _canSend(userId, eventType, entityId) {
    const since = new Date(Date.now() - RATE_LIMIT_MS);
    const existing = await prisma.emailLog.findFirst({
      where: { userId, eventType, entityId, sentAt: { gte: since } },
    });
    return !existing;
  }

  async _logSent(userId, eventType, entityId) {
    await prisma.emailLog.create({ data: { userId, eventType, entityId } });
  }

  // ── Unsubscribe token (HMAC-SHA256) ───────────────────────
  _makeToken(userId, eventType) {
    const payload = `${userId}:${eventType}`;
    const sig = crypto.createHmac('sha256', env.JWT_SECRET).update(payload).digest('hex');
    return Buffer.from(`${payload}:${sig}`).toString('base64url');
  }

  verifyToken(token) {
    try {
      const decoded = Buffer.from(token, 'base64url').toString();
      const lastColon = decoded.lastIndexOf(':');
      const payload = decoded.slice(0, lastColon);
      const sig = decoded.slice(lastColon + 1);
      const expected = crypto.createHmac('sha256', env.JWT_SECRET).update(payload).digest('hex');
      const sigBuf = Buffer.from(sig, 'hex');
      const expBuf = Buffer.from(expected, 'hex');
      if (sigBuf.length !== expBuf.length) return null;
      if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
      const [userId, eventType] = payload.split(':');
      return { userId, eventType };
    } catch {
      return null;
    }
  }

  _unsubscribeUrl(userId, eventType) {
    const base = env.APP_URL || `http://localhost:${env.PORT}`;
    return `${base}/api/email/unsubscribe?token=${this._makeToken(userId, eventType)}`;
  }

  // ── HTML template ──────────────────────────────────────────
  _template({ subject, preheader, body, unsubUrl }) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#0F1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <span style="display:none;font-size:1px;color:#0F1117;">${preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1117;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1A1D2E,#252840);border-radius:12px 12px 0 0;padding:28px 36px;border-bottom:1px solid rgba(106,56,227,0.3);">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:#6A38E3;border-radius:8px;width:32px;height:32px;text-align:center;vertical-align:middle;padding:6px;">
                        <span style="color:#fff;font-size:16px;font-weight:bold;">K</span>
                      </td>
                      <td style="padding-left:12px;color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
                        Kanban Realtime
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#1A1D2E;padding:36px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#13151F;border-radius:0 0 12px 12px;padding:20px 36px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0;font-size:12px;color:#4A5568;text-align:center;line-height:1.6;">
              Você recebeu este e-mail porque é membro do Kanban Realtime.<br>
              <a href="${unsubUrl}" style="color:#6A38E3;text-decoration:none;">Cancelar este tipo de notificação</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  _heading(text) {
    return `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#E8EAED;line-height:1.3;">${text}</h2>`;
  }

  _para(text) {
    return `<p style="margin:0 0 16px;font-size:15px;color:#A0AEC0;line-height:1.6;">${text}</p>`;
  }

  _chip(text) {
    return `<span style="display:inline-block;background:rgba(106,56,227,0.15);border:1px solid rgba(106,56,227,0.3);color:#A881FC;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:600;">${text}</span>`;
  }

  _blockquote(text) {
    return `<div style="border-left:3px solid #6A38E3;padding:12px 16px;background:rgba(106,56,227,0.08);border-radius:0 8px 8px 0;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#CBD5E0;line-height:1.6;">${text}</p>
    </div>`;
  }

  // ── Public send methods ────────────────────────────────────

  async sendMentionEmail({ toEmail, toName, toUserId, mentionedBy, cardTitle, boardName, commentContent }) {
    if (!await this._canSend(toUserId, 'MENTIONED', toUserId)) return;
    const transporter = this._getTransporter();
    if (!transporter) return;

    const preview = commentContent.replace(/@\[([^\]]+)\]/g, '@...').slice(0, 300);
    const unsubUrl = this._unsubscribeUrl(toUserId, 'MENTIONED');
    const subject = `${mentionedBy} mencionou você em "${cardTitle}"`;

    const body = [
      this._heading(`Você foi mencionado em um comentário`),
      this._para(`<strong style="color:#E8EAED;">${mentionedBy}</strong> mencionou você no card ${this._chip(cardTitle)} do board <strong style="color:#E8EAED;">${boardName}</strong>.`),
      this._blockquote(preview),
    ].join('');

    await transporter.sendMail({
      from: `"Kanban Realtime" <${env.SMTP_FROM}>`,
      to: `"${toName}" <${toEmail}>`,
      subject,
      text: `${mentionedBy} mencionou você em ${boardName} — card "${cardTitle}":\n\n${preview}\n\nCancelar: ${unsubUrl}`,
      html: this._template({ subject, preheader: `${mentionedBy} mencionou você no card "${cardTitle}"`, body, unsubUrl }),
    });

    await this._logSent(toUserId, 'MENTIONED', toUserId);
  }

  async sendAssignedEmail({ toEmail, toName, toUserId, assignedBy, cardTitle, boardName }) {
    if (!await this._canSend(toUserId, 'CARD_ASSIGNED', toUserId)) return;
    const transporter = this._getTransporter();
    if (!transporter) return;

    const unsubUrl = this._unsubscribeUrl(toUserId, 'CARD_ASSIGNED');
    const subject = `Você foi atribuído ao card "${cardTitle}"`;

    const body = [
      this._heading(`Novo card atribuído a você`),
      this._para(`<strong style="color:#E8EAED;">${assignedBy}</strong> atribuiu o card ${this._chip(cardTitle)} a você no board <strong style="color:#E8EAED;">${boardName}</strong>.`),
    ].join('');

    await transporter.sendMail({
      from: `"Kanban Realtime" <${env.SMTP_FROM}>`,
      to: `"${toName}" <${toEmail}>`,
      subject,
      text: `${assignedBy} atribuiu o card "${cardTitle}" a você em ${boardName}.\n\nCancelar: ${unsubUrl}`,
      html: this._template({ subject, preheader: `${assignedBy} atribuiu "${cardTitle}" a você`, body, unsubUrl }),
    });

    await this._logSent(toUserId, 'CARD_ASSIGNED', toUserId);
  }

  async sendDueDateEmail({ toEmail, toName, toUserId, cardTitle, boardName, dueDate }) {
    if (!await this._canSend(toUserId, 'DUE_DATE_REMINDER', toUserId)) return;
    const transporter = this._getTransporter();
    if (!transporter) return;

    const formatted = new Date(dueDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const unsubUrl = this._unsubscribeUrl(toUserId, 'DUE_DATE_REMINDER');
    const subject = `Lembrete: card "${cardTitle}" vence em menos de 24h`;

    const body = [
      this._heading(`Prazo se aproximando`),
      this._para(`O card ${this._chip(cardTitle)} no board <strong style="color:#E8EAED;">${boardName}</strong> vence em <strong style="color:#F6AD55;">${formatted}</strong>.`),
    ].join('');

    await transporter.sendMail({
      from: `"Kanban Realtime" <${env.SMTP_FROM}>`,
      to: `"${toName}" <${toEmail}>`,
      subject,
      text: `O card "${cardTitle}" em ${boardName} vence em ${formatted}.\n\nCancelar: ${unsubUrl}`,
      html: this._template({ subject, preheader: `"${cardTitle}" vence em ${formatted}`, body, unsubUrl }),
    });

    await this._logSent(toUserId, 'DUE_DATE_REMINDER', toUserId);
  }

  async sendMemberAddedEmail({ toEmail, toName, toUserId, addedBy, contextName, contextType }) {
    if (!await this._canSend(toUserId, 'BOARD_INVITE', toUserId)) return;
    const transporter = this._getTransporter();
    if (!transporter) return;

    const label = contextType === 'workspace' ? 'workspace' : 'board';
    const unsubUrl = this._unsubscribeUrl(toUserId, 'BOARD_INVITE');
    const subject = `Você foi adicionado ao ${label} "${contextName}"`;

    const body = [
      this._heading(`Acesso ao ${label} "${contextName}"`),
      this._para(`<strong style="color:#E8EAED;">${addedBy}</strong> adicionou você ao ${label} ${this._chip(contextName)}.`),
    ].join('');

    await transporter.sendMail({
      from: `"Kanban Realtime" <${env.SMTP_FROM}>`,
      to: `"${toName}" <${toEmail}>`,
      subject,
      text: `${addedBy} adicionou você ao ${label} "${contextName}".\n\nCancelar: ${unsubUrl}`,
      html: this._template({ subject, preheader: `${addedBy} adicionou você a ${contextName}`, body, unsubUrl }),
    });

    await this._logSent(toUserId, 'BOARD_INVITE', toUserId);
  }
}

module.exports = new EmailService();

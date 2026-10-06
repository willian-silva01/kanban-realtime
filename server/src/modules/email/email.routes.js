const { Router } = require('express');
const prisma = require('../../config/database');
const emailService = require('./email.service');

const router = Router();

const PREF_FIELD = {
  MENTIONED:         'emailMentions',
  CARD_ASSIGNED:     'emailAssigned',
  DUE_DATE_REMINDER: 'emailDueDate',
  BOARD_INVITE:      'emailBoardInvite',
  WORKSPACE_INVITE:  'emailBoardInvite',
};

const HTML_OK = (msg) => `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Kanban Realtime</title>
<style>body{margin:0;background:#0F1117;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.card{background:#1A1D2E;border:1px solid rgba(106,56,227,.3);border-radius:12px;padding:40px 48px;text-align:center;max-width:420px;}
h2{color:#E8EAED;margin:0 0 12px;}p{color:#A0AEC0;margin:0;line-height:1.6;}</style></head>
<body><div class="card"><h2>✓ Preferência salva</h2><p>${msg}</p></div></body></html>`;

const HTML_ERR = (msg) => `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Kanban Realtime</title>
<style>body{margin:0;background:#0F1117;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}
.card{background:#1A1D2E;border:1px solid rgba(227,56,77,.3);border-radius:12px;padding:40px 48px;text-align:center;max-width:420px;}
h2{color:#E3384D;margin:0 0 12px;}p{color:#A0AEC0;margin:0;}</style></head>
<body><div class="card"><h2>Link inválido</h2><p>${msg}</p></div></body></html>`;

router.get('/unsubscribe', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send(HTML_ERR('Token ausente.'));

  const parsed = emailService.verifyToken(token);
  if (!parsed) return res.status(400).send(HTML_ERR('Link inválido ou expirado.'));

  const { userId, eventType } = parsed;
  const field = PREF_FIELD[eventType];
  if (!field) return res.status(400).send(HTML_ERR('Tipo de notificação desconhecido.'));

  await prisma.user.update({ where: { id: userId }, data: { [field]: false } });

  const labels = {
    emailMentions:    'menções em comentários',
    emailAssigned:    'atribuição a cartões',
    emailDueDate:     'lembretes de prazo',
    emailBoardInvite: 'convites para boards/workspaces',
  };

  res.send(HTML_OK(`E-mails de <strong>${labels[field]}</strong> foram desativados.<br>Você pode reativá-los nas preferências do seu perfil.`));
});

module.exports = router;

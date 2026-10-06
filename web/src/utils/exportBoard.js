import { jsPDF } from 'jspdf';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCSV(boardName, columns, cards) {
  const header = ['Título', 'Coluna', 'Responsáveis', 'Data de Vencimento', 'Labels'];
  const rows = [];

  for (const col of columns) {
    const colCards = cards.filter((c) => c.columnId === col.id);
    for (const card of colCards) {
      rows.push([
        card.title,
        col.name,
        (card.assignees ?? []).map((a) => a.name).join('; '),
        formatDate(card.dueDate),
        (card.labels ?? []).map((l) => l.name).join('; '),
      ]);
    }
  }

  const csvContent = [header, ...rows]
    .map((row) => row.map(csvEscape).join(','))
    .join('\r\n');

  // BOM for Excel UTF-8 compatibility
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const safe = (boardName || 'board').replace(/[^a-zA-Z0-9_\-]/g, '_');
  triggerDownload(blob, `${safe}_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportToPDF(boardName, columns, cards) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 14;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ── Colors ──
  const COL_HEADER_R = 106, COL_HEADER_G = 56, COL_HEADER_B = 227;
  const CARD_BG_R = 240, CARD_BG_G = 240, CARD_BG_B = 248;
  const LABEL_R = 168, LABEL_G = 129, LABEL_B = 252;
  const TEXT_DARK = [30, 30, 50];
  const TEXT_MED = [80, 80, 100];

  let y = MARGIN;

  function checkPageBreak(needed = 10) {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  // ── Header ──
  doc.setFillColor(COL_HEADER_R, COL_HEADER_G, COL_HEADER_B);
  doc.roundedRect(MARGIN, y, CONTENT_W, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(boardName || 'Board', MARGIN + 4, y + 7);

  const exportedAt = `Exportado em ${formatDate(new Date().toISOString())}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(220, 210, 255);
  doc.text(exportedAt, PAGE_W - MARGIN - doc.getTextWidth(exportedAt), y + 7);

  y += 14;

  for (const col of columns) {
    const colCards = cards.filter((c) => c.columnId === col.id);
    checkPageBreak(18);

    // ── Column header ──
    doc.setFillColor(COL_HEADER_R, COL_HEADER_G, COL_HEADER_B);
    doc.roundedRect(MARGIN, y, CONTENT_W, 7, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`${col.name}  (${colCards.length})`, MARGIN + 3, y + 5);
    y += 9;

    if (colCards.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...TEXT_MED);
      doc.text('Sem cartões', MARGIN + 4, y + 4);
      y += 8;
    }

    for (const card of colCards) {
      const lines = doc.splitTextToSize(card.title, CONTENT_W - 8);
      const titleH = lines.length * 4.5;
      const hasMeta = card.dueDate || (card.assignees?.length > 0) || (card.labels?.length > 0);
      const cardH = 4 + titleH + (hasMeta ? 6 : 0) + 3;

      checkPageBreak(cardH + 2);

      // Card background
      doc.setFillColor(CARD_BG_R, CARD_BG_G, CARD_BG_B);
      doc.roundedRect(MARGIN + 2, y, CONTENT_W - 4, cardH, 1.5, 1.5, 'F');

      // Label dots
      if (card.labels?.length > 0) {
        let dotX = MARGIN + 5;
        for (const lbl of card.labels.slice(0, 6)) {
          const [r, g, b] = hexToRgb(lbl.color);
          doc.setFillColor(r, g, b);
          doc.circle(dotX, y + 2.5, 1.2, 'F');
          dotX += 4;
        }
      }

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...TEXT_DARK);
      doc.text(lines, MARGIN + 5, y + 5.5);

      // Meta row
      if (hasMeta) {
        const metaY = y + 5.5 + titleH;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...TEXT_MED);

        const parts = [];
        if (card.dueDate) parts.push(`Prazo: ${formatDate(card.dueDate)}`);
        if (card.assignees?.length > 0)
          parts.push(`👤 ${card.assignees.map((a) => a.name).join(', ')}`);
        if (card.labels?.length > 0)
          parts.push(card.labels.map((l) => l.name).join(', '));

        doc.text(parts.join('   '), MARGIN + 5, metaY);
      }

      y += cardH + 2;
    }

    y += 4;
  }

  const safe = (boardName || 'board').replace(/[^a-zA-Z0-9_\-]/g, '_');
  doc.save(`${safe}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function hexToRgb(hex) {
  const h = (hex || '#888888').replace('#', '');
  const full = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

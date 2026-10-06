import React, { useState, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Eye, Edit3, Check } from 'lucide-react';
import './MarkdownEditor.css';

marked.use({ breaks: true, gfm: true });

export default function MarkdownEditor({ initialValue = '', onSave, saving }) {
  const [mode, setMode] = useState('edit');
  const [value, setValue] = useState(initialValue);
  const [hasSaved, setHasSaved] = useState(Boolean(initialValue));
  const debounceRef = useRef(null);
  const savedRef = useRef(initialValue);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const scheduleAutoSave = useCallback(
    (text) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (text !== savedRef.current) {
          savedRef.current = text;
          onSave(text || null);
          setHasSaved(true);
        }
      }, 1000);
    },
    [onSave]
  );

  const handleChange = (e) => {
    const text = e.target.value;
    setValue(text);
    scheduleAutoSave(text);
  };

  const html = DOMPurify.sanitize(marked.parse(value || ''));

  return (
    <div
      className="md-editor"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="md-editor-toolbar">
        <button
          className={`md-tab ${mode === 'edit' ? 'active' : ''}`}
          onClick={() => setMode('edit')}
        >
          <Edit3 size={11} /> Editar
        </button>
        <button
          className={`md-tab ${mode === 'preview' ? 'active' : ''}`}
          onClick={() => setMode('preview')}
        >
          <Eye size={11} /> Preview
        </button>
        {saving && <span className="md-saving">salvando…</span>}
        {!saving && hasSaved && (
          <span className="md-saved"><Check size={10} /> salvo</span>
        )}
      </div>

      {mode === 'edit' ? (
        <textarea
          className="md-editor-textarea"
          value={value}
          onChange={handleChange}
          placeholder="Descreva o cartão em Markdown…"
          rows={6}
          autoFocus
        />
      ) : (
        <div
          className="md-editor-preview"
          dangerouslySetInnerHTML={{ __html: html || '<em>Sem descrição</em>' }}
        />
      )}
    </div>
  );
}

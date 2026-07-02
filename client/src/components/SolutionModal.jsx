import { useEffect, useState } from 'react';

export default function SolutionModal({ open, problem, onClose }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) { setActiveIdx(0); setCopied(false); }
  }, [open, problem]);

  if (!open || !problem) return null;

  const sols = (problem.solutions && problem.solutions.length) ? problem.solutions : [];
  const current = sols[activeIdx];
  const code = current ? (current.code || '// No code added yet.') : '// No solution added yet.';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal solution-modal">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{problem.name}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="lang-tabs">
            {sols.map((s, i) => (
              <button
                key={i}
                type="button"
                className={`lang-tab${i === activeIdx ? ' active' : ''}`}
                onClick={() => { setActiveIdx(i); setCopied(false); }}
              >
                {s.lang}
              </button>
            ))}
          </div>
          <div className="mac-window">
            <div className="mac-window-bar">
              <div className="mac-dots">
                <span className="mac-dot mac-dot-red"></span>
                <span className="mac-dot mac-dot-yellow"></span>
                <span className="mac-dot mac-dot-green"></span>
              </div>
              <span className="mac-window-lang">{current ? current.lang : ''}</span>
              <button className={`copy-btn${copied ? ' copied' : ''}`} type="button" onClick={handleCopy}>
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="solution-code">{code}</pre>
          </div>
          {problem.notes && (
            <div className="solution-notes visible">
              <p className="notes-label">Notes</p>
              <p>{problem.notes}</p>
            </div>
          )}
          {problem.notesImage && (
            <div className="solution-notes-image visible">
              <p className="notes-label">Notes Image</p>
              <img className="solution-notes-img" src={problem.notesImage} alt="Notes" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

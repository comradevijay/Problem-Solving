import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

const STEP_MS = 1400;

function ArrayViz({ label, values, highlight = [], matched = [] }) {
  return (
    <div className="lp-array-row">
      <span className="lp-array-label">{label}</span>
      <div className="lp-array-cells">
        {values.map((v, i) => {
          const isHi = highlight.includes(i);
          const isMatch = matched.includes(i);
          return (
            <span
              key={i}
              className={`lp-cell${isHi ? ' lp-cell-hi' : ''}${isMatch ? ' lp-cell-matched' : ''}`}
            >
              {String(v)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function LivePreview({ problem, lang, code, isAuthenticated, toast }) {
  const [status, setStatus] = useState('loading'); // loading | missing | ready | error
  const [trace, setTrace] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setPlaying(false);
    setStepIdx(0);
    setStatus('loading');
    setTrace(null);
    if (!problem || !lang) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await api('GET', `/api/problems/${problem.uid}/trace/${lang}`);
        if (!cancelled) { setTrace(data); setStatus('ready'); }
      } catch {
        if (!cancelled) setStatus('missing');
      }
    })();
    return () => { cancelled = true; };
  }, [problem, lang]);

  // ===== AUTO-PLAY =====
  useEffect(() => {
    if (!playing || !trace) return;
    timerRef.current = setInterval(() => {
      setStepIdx(i => {
        if (i >= trace.steps.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, STEP_MS);
    return () => clearInterval(timerRef.current);
  }, [playing, trace]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const data = await api('POST', `/api/problems/${problem.uid}/trace`, { lang });
      setTrace(data);
      setStatus('ready');
      setStepIdx(0);
    } catch (err) {
      toast(err.message || 'Failed to generate live preview', true);
    } finally {
      setGenerating(false);
    }
  }

  if (status === 'loading') {
    return <div className="lp-loading">Loading live preview…</div>;
  }

  if (status === 'missing' || status === 'error') {
    return (
      <div className="lp-empty">
        <p>🔮 No live preview added yet for this language.</p>
        {isAuthenticated ? (
          <button className="btn-save" disabled={generating} onClick={handleGenerate}>
            {generating ? 'Generating…' : 'Generate Live Preview'}
          </button>
        ) : (
          <p className="lp-empty-sub">The owner needs to add this first.</p>
        )}
      </div>
    );
  }

  const steps = trace.steps;
  const step = steps[stepIdx];
  const codeLines = code.split('\n');

  return (
    <div className="live-preview">
      <div className="lp-header">
        <span className="lp-header-label">● LIVE PREVIEW</span>
        <span className="lp-step-count">STEP {stepIdx + 1} / {steps.length}</span>
      </div>

      <div className="lp-viz">
        {(step.arrays || []).map((arr, i) => (
          <ArrayViz key={i} {...arr} />
        ))}
        {step.vars && Object.keys(step.vars).length > 0 && (
          <div className="lp-vars">
            {Object.entries(step.vars).map(([k, v]) => (
              <span className="lp-var" key={k}>{k} = {JSON.stringify(v)}</span>
            ))}
          </div>
        )}
        <p className="lp-desc">{step.description}</p>
      </div>

      <div className="lp-controls">
        <button className="lp-btn" onClick={() => setStepIdx(0)} disabled={stepIdx === 0}>⏮</button>
        <button className="lp-btn" onClick={() => setStepIdx(i => Math.max(0, i - 1))} disabled={stepIdx === 0}>◀</button>
        <button className="lp-btn lp-btn-play" onClick={() => setPlaying(p => !p)}>
          {playing ? '⏸' : '▶'}
        </button>
        <button className="lp-btn" onClick={() => setStepIdx(i => Math.min(steps.length - 1, i + 1))} disabled={stepIdx === steps.length - 1}>▶</button>
        <button className="lp-btn" onClick={() => setStepIdx(steps.length - 1)} disabled={stepIdx === steps.length - 1}>⏭</button>
        {isAuthenticated && (
          <button className="lp-regen" disabled={generating} onClick={handleGenerate} title="Regenerate">
            {generating ? '…' : '↻ Regenerate'}
          </button>
        )}
      </div>

      <div className="mac-window lp-code-window">
        <div className="mac-window-bar">
          <div className="mac-dots">
            <span className="mac-dot mac-dot-red"></span>
            <span className="mac-dot mac-dot-yellow"></span>
            <span className="mac-dot mac-dot-green"></span>
          </div>
          <span className="mac-window-lang">{lang}</span>
        </div>
        <pre className="solution-code lp-code">
          {codeLines.map((line, i) => (
            <div key={i} className={`lp-code-line${i + 1 === step.line ? ' lp-code-line-active' : ''}`}>
              {line || ' '}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
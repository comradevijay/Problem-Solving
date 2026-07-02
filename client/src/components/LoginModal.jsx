import { useEffect, useRef, useState } from 'react';

export default function LoginModal({ open, onClose, onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPassword('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    setChecking(true);
    const ok = await onLogin(password);
    if (!ok) {
      setError('Wrong password. Try again.');
      setPassword('');
      inputRef.current?.focus();
    }
    setChecking(false);
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal login-modal">
        <div className="modal-header">
          <h2 className="modal-title">Owner Login</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            This site is personal. Enter your password to add or manage problems.
          </p>
          <div className="form-group">
            <label>Password</label>
            <input
              ref={inputRef}
              type="password"
              className="form-input"
              placeholder="Enter password..."
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>
          <p style={{ fontSize: 13, color: 'var(--hard)', minHeight: 18 }}>{error}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" disabled={checking} onClick={handleSubmit}>
            {checking ? 'Checking…' : 'Unlock 🔓'}
          </button>
        </div>
      </div>
    </div>
  );
}

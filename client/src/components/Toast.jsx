import { useCallback, useRef, useState } from 'react';

// Mirrors the original toast(msg, error) DOM-append/auto-remove behavior.
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const toast = useCallback((msg, error = false) => {
    const id = ++seq.current;
    setToasts(t => [...t, { id, msg, error }]);
    setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id));
    }, 2600);
  }, []);

  return { toasts, toast };
}

export default function ToastContainer({ toasts }) {
  return (
    <>
      {toasts.map(t => (
        <div
          key={t.id}
          className="toast"
          style={{ borderLeftColor: t.error ? 'var(--hard)' : 'var(--easy)' }}
        >
          {t.msg}
        </div>
      ))}
    </>
  );
}

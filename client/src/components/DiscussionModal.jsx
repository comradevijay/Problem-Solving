import { useEffect, useState } from 'react';
import { api } from '../api';
import { timeAgo } from '../utils';
import { SkeletonComment } from './Skeletons';

export default function DiscussionModal({ open, problem, isAuthenticated, onClose, toast }) {
  const [comments, setComments] = useState(null); // null = loading
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!open || !problem) return;
    setComments(null);
    setName('');
    setText('');
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, problem]);

  async function loadComments() {
    try {
      const data = await api('GET', `/api/comments/${problem.uid}`);
      setComments(data);
    } catch {
      setComments('error');
    }
  }

  if (!open || !problem) return null;

  async function handlePost() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPosting(true);
    try {
      await api('POST', `/api/comments/${problem.uid}`, { author: name.trim() || 'Anonymous', text: trimmed });
      setText('');
      await loadComments();
    } catch (err) {
      toast(err.message || 'Failed to post', true);
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(cid) {
    if (!confirm('Delete this comment?')) return;
    try {
      await api('DELETE', `/api/comments/${cid}`);
      setComments(c => (Array.isArray(c) ? c.filter(x => x._id !== cid) : c));
      toast('Comment deleted');
    } catch (err) {
      toast(err.message || 'Failed to delete', true);
    }
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal discussion-modal">
        <div className="modal-header">
          <h2 className="modal-title">💬 {problem.name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body disc-body">
          <div className="disc-comments-list">
            {comments === null && (
              <>
                <SkeletonComment />
                <SkeletonComment />
                <SkeletonComment />
              </>
            )}
            {comments === 'error' && <div className="disc-loading disc-error">Failed to load comments.</div>}
            {Array.isArray(comments) && comments.length === 0 && (
              <div className="disc-empty">No comments yet — be the first! 🚀</div>
            )}
            {Array.isArray(comments) && comments.map(c => (
              <div className="disc-comment" key={c._id}>
                <div className="disc-comment-header">
                  <span className="disc-author">{c.author}</span>
                  <span className="disc-time">{timeAgo(c.createdAt)}</span>
                  {isAuthenticated && (
                    <button className="disc-delete" onClick={() => handleDelete(c._id)}>✕</button>
                  )}
                </div>
                <p className="disc-text">{c.text}</p>
              </div>
            ))}
          </div>
          <div className="disc-composer">
            <input
              type="text"
              className="form-input disc-name-input"
              placeholder="Your name (optional)"
              maxLength={60}
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <textarea
              className="form-input disc-text-input"
              placeholder="Share your approach, ask a question, or drop a tip… (Ctrl+Enter to post)"
              maxLength={2000}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handlePost(); }}
            />
            <div className="disc-composer-footer">
              <span className="disc-hint">Ctrl+Enter to post</span>
              <button className="btn-save disc-post-btn" disabled={posting} onClick={handlePost}>
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
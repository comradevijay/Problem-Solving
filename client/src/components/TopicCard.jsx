import { useState } from 'react';
import { getLCLabel } from '../utils';

function DiffTag({ diff }) {
  const cls = { Easy: 'easy', Medium: 'medium', Hard: 'hard' }[diff] || 'easy';
  return <span className={`tag tag-${cls}`}>{diff}</span>;
}

export default function TopicCard({ topic, items, isAuthenticated, onView, onDiscuss, onEdit, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);

  const easyC = items.filter(p => p.difficulty === 'Easy').length;
  const medC = items.filter(p => p.difficulty === 'Medium').length;
  const hardC = items.filter(p => p.difficulty === 'Hard').length;

  return (
    <div className={`topic-card${collapsed ? ' collapsed' : ''}`} data-topic={topic}>
      <div className="topic-header" onClick={() => setCollapsed(c => !c)}>
        <span className="topic-title">{topic}</span>
        <div className="topic-meta">
          {easyC ? <span className="tag tag-easy">{easyC}E</span> : null}
          {medC ? <span className="tag tag-medium">{medC}M</span> : null}
          {hardC ? <span className="tag tag-hard">{hardC}H</span> : null}
          <span className="tag tag-total">{items.length} problems</span>
          <span className="chevron">▾</span>
        </div>
      </div>
      <div className="topic-table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th style={{ width: 50 }}>ID</th><th>Problem</th>
              <th>Difficulty</th><th>LeetCode</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p, i) => (
              <tr key={p.uid}>
                <td className="td-num">{String(i + 1).padStart(2, '0')}</td>
                <td className="td-id">{p.id || '—'}</td>
                <td className="td-name">{p.name}</td>
                <td className="td-diff"><DiffTag diff={p.difficulty} /></td>
                <td className="td-link">
                  {p.link
                    ? <a className="lc-link" href={p.link} target="_blank" rel="noopener noreferrer">{getLCLabel(p.link)}</a>
                    : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                </td>
                <td className="td-actions">
                  <div className="action-group">
                    <button className="btn-view" onClick={() => onView(p.uid)}>Solution</button>
                    <button className="btn-discuss" onClick={() => onDiscuss(p.uid)}> Discuss</button>
                    {isAuthenticated && <button className="btn-edit" onClick={() => onEdit(p.uid)}>Edit</button>}
                    {isAuthenticated && <button className="btn-delete" onClick={() => onDelete(p.uid)}>✕</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

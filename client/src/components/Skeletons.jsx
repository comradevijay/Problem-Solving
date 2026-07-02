// Reusable skeleton-screen building blocks. `.sk` gets the shimmer animation
// from styles.css; callers just size it with inline width/height or a
// dedicated class.

export function SkeletonTopicCard({ rows = 4 }) {
  return (
    <div className="topic-card sk-card" aria-hidden="true">
      <div className="topic-header sk-topic-header">
        <span className="sk sk-text" style={{ width: 140, height: 16 }} />
        <div className="topic-meta">
          <span className="sk sk-pill" />
          <span className="sk sk-pill" />
        </div>
      </div>
      <div className="topic-table-wrap">
        <table>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                <td className="td-num"><span className="sk sk-text" style={{ width: 18 }} /></td>
                <td className="td-id"><span className="sk sk-text" style={{ width: 24 }} /></td>
                <td className="td-name"><span className="sk sk-text" style={{ width: `${50 + (i * 13) % 40}%` }} /></td>
                <td className="td-diff"><span className="sk sk-pill" /></td>
                <td className="td-link"><span className="sk sk-text" style={{ width: 30 }} /></td>
                <td className="td-actions"><span className="sk sk-text" style={{ width: 90 }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkeletonComment() {
  return (
    <div className="disc-comment sk-comment" aria-hidden="true">
      <div className="disc-comment-header">
        <span className="sk sk-text" style={{ width: 70, height: 11 }} />
        <span className="sk sk-text" style={{ width: 40, height: 11 }} />
      </div>
      <span className="sk sk-text" style={{ width: '85%', height: 13, marginTop: 6 }} />
    </div>
  );
}
export default function Header({ problems, theme, onToggleTheme, isAuthenticated, onLogin, onLogout }) {
  const total = problems.length;
  const easy = problems.filter(p => p.difficulty === 'Easy').length;
  const medium = problems.filter(p => p.difficulty === 'Medium').length;
  const hard = problems.filter(p => p.difficulty === 'Hard').length;

  return (
    <header className="header">
      <div className="header-left">
        <span className="logo-icon">⚡</span>
        <div>
          <h1 className="logo-title">DSA Grind</h1>
          <p className="logo-sub">My Problem Log</p>
        </div>
      </div>
      <div className="header-right">
        <div className="stats-bar">
          <div className="stat"><span className="stat-val">{total}</span><span className="stat-label">Solved</span></div>
          <div className="stat-divider"></div>
          <div className="stat"><span className="stat-val easy-text">{easy}</span><span className="stat-label">Easy</span></div>
          <div className="stat-divider"></div>
          <div className="stat"><span className="stat-val medium-text">{medium}</span><span className="stat-label">Medium</span></div>
          <div className="stat-divider"></div>
          <div className="stat"><span className="stat-val hard-text">{hard}</span><span className="stat-label">Hard</span></div>
        </div>
        <button className="theme-toggle" title="Toggle theme" onClick={onToggleTheme}>
          <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
        </button>
        {!isAuthenticated && (
          <button className="login-btn" onClick={onLogin}>🔐 Login</button>
        )}
        {isAuthenticated && (
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        )}
      </div>
    </header>
  );
}

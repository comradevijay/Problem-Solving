import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { useToast } from './components/Toast';
import ToastContainer from './components/Toast';
import Header from './components/Header';
import Controls from './components/Controls';
import TopicCard from './components/TopicCard';
import ProblemModal from './components/ProblemModal';
import SolutionModal from './components/SolutionModal';
import LoginModal from './components/LoginModal';
import DiscussionModal from './components/DiscussionModal';

export default function App() {
  const [problems, setProblems] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('dsa_theme') || 'dark');

  const [problemModalOpen, setProblemModalOpen] = useState(false);
  const [editingUid, setEditingUid] = useState(null);
  const [solutionModalUid, setSolutionModalUid] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [discussionUid, setDiscussionUid] = useState(null);

  const { toasts, toast } = useToast();
  const searchInputRef = useRef(null);

  // ===== THEME =====
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dsa_theme', theme);
  }, [theme]);

  // ===== INITIAL LOAD =====
  useEffect(() => {
    (async () => {
      try {
        const authData = await api('GET', '/api/auth/status');
        setIsAuthenticated(authData.authenticated);
      } catch { /* ignore */ }
      try {
        const data = await api('GET', '/api/problems');
        setProblems(data);
      } catch { /* ignore */ }
    })();
  }, []);

  // ===== KEYBOARD SHORTCUTS =====
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setProblemModalOpen(false);
        setSolutionModalUid(null);
        setLoginModalOpen(false);
        setDiscussionUid(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // ===== DERIVED DATA =====
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return problems.filter(p => {
      const matchFilter = activeFilter === 'All' || p.difficulty === activeFilter;
      const matchSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q) ||
        (p.topic || '').toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [problems, activeFilter, searchQuery]);

  const groups = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const topic = p.topic || 'Uncategorized';
      if (!map[topic]) map[topic] = [];
      map[topic].push(p);
    });
    return map;
  }, [filtered]);

  const topics = useMemo(
    () => [...new Set(problems.map(p => p.topic).filter(Boolean))],
    [problems]
  );

  // ===== AUTH =====
  async function handleLogin(password) {
    try {
      await api('POST', '/api/auth/login', { password });
      setIsAuthenticated(true);
      toast('Welcome back! 👋');
      setLoginModalOpen(false);
      return true;
    } catch {
      return false;
    }
  }

  async function handleLogout() {
    await api('POST', '/api/auth/logout');
    setIsAuthenticated(false);
    toast('Logged out');
  }

  // ===== PROBLEM CRUD =====
  function openAddModal() {
    if (!isAuthenticated) { toast('Please log in first', true); return; }
    setEditingUid(null);
    setProblemModalOpen(true);
  }

  function openEditModal(uid) {
    if (!isAuthenticated) { toast('Please log in first', true); return; }
    setEditingUid(uid);
    setProblemModalOpen(true);
  }

  async function saveProblem(payload, editUid) {
    try {
      if (editUid) {
        const updated = await api('PUT', `/api/problems/${editUid}`, payload);
        setProblems(ps => ps.map(p => p.uid === editUid ? updated : p));
        toast('Problem updated ✓');
      } else {
        const created = await api('POST', '/api/problems', payload);
        setProblems(ps => [...ps, created]);
        toast('Problem added ✓');
      }
      setProblemModalOpen(false);
    } catch (err) {
      toast(err.message || 'Failed to save', true);
    }
  }

  async function deleteProblem(uid) {
    if (!confirm('Remove this problem?')) return;
    try {
      await api('DELETE', `/api/problems/${uid}`);
      setProblems(ps => ps.filter(p => p.uid !== uid));
      toast('Problem removed');
    } catch (err) {
      toast(err.message || 'Failed to delete', true);
    }
  }

  const editingProblem = editingUid ? problems.find(p => p.uid === editingUid) : null;
  const solutionProblem = solutionModalUid ? problems.find(p => p.uid === solutionModalUid) : null;
  const discussionProblem = discussionUid ? problems.find(p => p.uid === discussionUid) : null;

  return (
    <>
      <Header
        problems={problems}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        isAuthenticated={isAuthenticated}
        onLogin={() => setLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      <Controls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        isAuthenticated={isAuthenticated}
        onAdd={openAddModal}
        searchInputRef={searchInputRef}
      />

      <main className="main">
        {Object.keys(groups).length === 0 && (
          <div className="empty-state visible">
            <div className="empty-icon">🧩</div>
            <p className="empty-title">No problems yet</p>
            <p className="empty-sub">Hit <strong>+ Add Problem</strong> to log your first solve!</p>
          </div>
        )}
        {Object.entries(groups).map(([topic, items]) => (
          <TopicCard
            key={topic}
            topic={topic}
            items={items}
            isAuthenticated={isAuthenticated}
            onView={setSolutionModalUid}
            onDiscuss={setDiscussionUid}
            onEdit={openEditModal}
            onDelete={deleteProblem}
          />
        ))}
      </main>

      <ProblemModal
        open={problemModalOpen}
        editingProblem={editingProblem}
        topics={topics}
        onClose={() => setProblemModalOpen(false)}
        onSave={saveProblem}
        toast={toast}
      />

      <SolutionModal
        open={!!solutionModalUid}
        problem={solutionProblem}
        onClose={() => setSolutionModalUid(null)}
      />

      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLogin={handleLogin}
      />

      <DiscussionModal
        open={!!discussionUid}
        problem={discussionProblem}
        isAuthenticated={isAuthenticated}
        onClose={() => setDiscussionUid(null)}
        toast={toast}
      />

      <ToastContainer toasts={toasts} />
    </>
  );
}

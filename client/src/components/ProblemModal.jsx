import { useEffect, useRef, useState } from 'react';
import { LANG_OPTIONS } from '../utils';

const emptyForm = {
  id: '', name: '', difficulty: 'Medium', topic: '', link: '',
  notes: '', notesImage: ''
};

export default function ProblemModal({ open, editingProblem, topics, onClose, onSave, toast }) {
  const [form, setForm] = useState(emptyForm);
  const [solutions, setSolutions] = useState([{ lang: 'python', code: '' }]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (editingProblem) {
      setForm({
        id: editingProblem.id || '',
        name: editingProblem.name || '',
        difficulty: editingProblem.difficulty || 'Medium',
        topic: editingProblem.topic || '',
        link: editingProblem.link || '',
        notes: editingProblem.notes || '',
        notesImage: editingProblem.notesImage || ''
      });
      const sols = (editingProblem.solutions && editingProblem.solutions.length)
        ? editingProblem.solutions
        : [{ lang: 'python', code: '' }];
      setSolutions(sols.map(s => ({ ...s })));
    } else {
      setForm(emptyForm);
      setSolutions([{ lang: 'python', code: '' }]);
    }
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }, [open, editingProblem]);

  if (!open) return null;

  function updateField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function addSolutionBlock() {
    setSolutions(s => [...s, { lang: 'python', code: '' }]);
  }

  function removeSolutionBlock(idx) {
    setSolutions(s => s.filter((_, i) => i !== idx));
  }

  function updateSolution(idx, key, value) {
    setSolutions(s => s.map((sol, i) => i === idx ? { ...sol, [key]: value } : sol));
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Please select an image file', true); return; }
    if (file.size > 8 * 1024 * 1024) { toast('Image too large (max 8MB)', true); return; }
    const reader = new FileReader();
    reader.onload = () => updateField('notesImage', reader.result);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    if (fileInputRef.current) fileInputRef.current.value = '';
    updateField('notesImage', '');
  }

  async function handleSave() {
    const name = form.name.trim();
    if (!name) { nameInputRef.current?.focus(); toast('Problem name is required', true); return; }

    const payload = {
      id: form.id.trim(),
      name,
      difficulty: form.difficulty,
      topic: form.topic.trim() || 'Uncategorized',
      link: form.link.trim(),
      solutions: solutions.filter(s => s.code.trim() !== ''),
      notes: form.notes.trim(),
      notesImage: form.notesImage || ''
    };

    setSaving(true);
    try {
      await onSave(payload, editingProblem ? editingProblem.uid : null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{editingProblem ? 'Edit Problem' : 'Add Problem'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-row two-col">
            <div className="form-group">
              <label>Problem ID</label>
              <input type="text" className="form-input" placeholder="e.g. 169"
                value={form.id} onChange={e => updateField('id', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Difficulty</label>
              <select className="form-input" value={form.difficulty} onChange={e => updateField('difficulty', e.target.value)}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Problem Name</label>
            <input ref={nameInputRef} type="text" className="form-input" placeholder="e.g. Two Sum"
              value={form.name} onChange={e => updateField('name', e.target.value)} />
          </div>

          <div className="form-row two-col">
            <div className="form-group">
              <label>Topic / Category</label>
              <input type="text" className="form-input" placeholder="e.g. Arrays, DP, Graphs" list="topicList"
                value={form.topic} onChange={e => updateField('topic', e.target.value)} />
              <datalist id="topicList">
                {topics.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label>LeetCode Link</label>
              <input type="url" className="form-input" placeholder="https://leetcode.com/problems/..."
                value={form.link} onChange={e => updateField('link', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Solutions (add one or more languages)</label>
            <div className="solutions-builder">
              {solutions.map((s, idx) => (
                <div className="solution-block" key={idx}>
                  <div className="solution-block-head">
                    <select className="form-input sol-lang-select" value={s.lang}
                      onChange={e => updateSolution(idx, 'lang', e.target.value)}>
                      {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button type="button" className="btn-remove-lang" title="Remove this language"
                      onClick={() => removeSolutionBlock(idx)}>✕</button>
                  </div>
                  <textarea className="form-input code-area sol-code-area" placeholder="Paste your solution here..."
                    value={s.code} onChange={e => updateSolution(idx, 'code', e.target.value)} />
                </div>
              ))}
            </div>
            <button type="button" className="btn-add-lang" onClick={addSolutionBlock}>+ Add Language</button>
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea className="form-input notes-area"
              placeholder="Key insight, time/space complexity, patterns used..."
              value={form.notes} onChange={e => updateField('notes', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Notes Image (optional)</label>
            <div className="notes-image-uploader">
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              {!form.notesImage && (
                <div className="notes-image-empty" onClick={() => fileInputRef.current?.click()}>
                  <span>🖼️ Click to upload a notes image (algo steps, whiteboard, etc.)</span>
                </div>
              )}
              {form.notesImage && (
                <div className="notes-image-preview-wrap" style={{ display: 'block' }}>
                  <img className="notes-image-preview" src={form.notesImage} alt="Notes" />
                  <button type="button" className="notes-image-remove" onClick={removeImage}>✕ Remove</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save Problem'}
          </button>
        </div>
      </div>
    </div>
  );
}

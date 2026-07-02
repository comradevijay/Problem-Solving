const FILTERS = ['All', 'Easy', 'Medium', 'Hard'];

export default function Controls({ searchQuery, onSearchChange, activeFilter, onFilterChange, isAuthenticated, onAdd, searchInputRef }) {
  return (
    <div className="controls">
      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input
          ref={searchInputRef}
          type="text"
          className="search-input"
          placeholder="Search problems..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>
      <div className="filter-group">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`filter-btn${f !== 'All' ? ' ' + f.toLowerCase() : ''}${activeFilter === f ? ' active' : ''}`}
            onClick={() => onFilterChange(f)}
          >
            {f}
          </button>
        ))}
      </div>
      {isAuthenticated && (
        <button className="add-btn" onClick={onAdd}>+ Add Problem</button>
      )}
    </div>
  );
}

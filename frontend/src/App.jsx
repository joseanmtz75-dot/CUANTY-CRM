import { useState } from 'react';
import FollowUpView from './components/FollowUpView';
import Dashboard from './components/Dashboard';
import ClientTable from './components/ClientTable';
import ChatAssistant from './components/ChatAssistant';
import './App.css';

function App() {
  const [view, setView] = useState('seguimiento');
  const [viewFilter, setViewFilter] = useState(null);

  const handleNavigate = (targetView, filter) => {
    setView(targetView);
    setViewFilter(filter || null);
  };

  const handleNavClick = (targetView) => {
    setView(targetView);
    setViewFilter(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">CUANTY CRM</h1>
        <nav className="app-nav">
          <button
            className={`nav-btn ${view === 'seguimiento' ? 'active' : ''}`}
            onClick={() => handleNavClick('seguimiento')}
          >
            Seguimiento
          </button>
          <button
            className={`nav-btn ${view === 'clients' ? 'active' : ''}`}
            onClick={() => handleNavClick('clients')}
          >
            Clientes
          </button>
          <button
            className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
          >
            Dashboard
          </button>
        </nav>
      </header>
      <main className="app-main">
        {view === 'seguimiento' && (
          <FollowUpView
            initialFilter={viewFilter?.type === 'seguimiento' ? viewFilter : null}
            onClearFilter={() => setViewFilter(null)}
          />
        )}
        {view === 'clients' && (
          <ClientTable
            initialFilter={['estatus', 'temperatura', 'sugerencia', 'disposition'].includes(viewFilter?.type) ? viewFilter : null}
            onClearFilter={() => setViewFilter(null)}
          />
        )}
        {view === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
      </main>
      <ChatAssistant />
    </div>
  );
}

export default App;

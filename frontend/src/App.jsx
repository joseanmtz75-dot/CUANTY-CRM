import { useState } from 'react';
import MiDia from './components/MiDia';
import FollowUpView from './components/FollowUpView';
import Dashboard from './components/Dashboard';
import ClientTable from './components/ClientTable';
import VendedorView from './components/VendedorView';
import MiRendimiento from './components/MiRendimiento';
import ChatAssistant from './components/ChatAssistant';
import AlertasPanel from './components/AlertasPanel';
import './App.css';

function App() {
  const [view, setView] = useState('mi-dia');
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
        <AlertasPanel onViewClient={(id, nombre) => handleNavigate('clients', { type: 'search', value: nombre, label: nombre })} />
        <nav className="app-nav">
          <button
            className={`nav-btn ${view === 'mi-dia' ? 'active' : ''}`}
            onClick={() => handleNavClick('mi-dia')}
          >
            Mi Dia
          </button>
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
            className={`nav-btn ${view === 'vendedores' ? 'active' : ''}`}
            onClick={() => handleNavClick('vendedores')}
          >
            Vendedores
          </button>
          <button
            className={`nav-btn ${view === 'rendimiento' ? 'active' : ''}`}
            onClick={() => handleNavClick('rendimiento')}
          >
            Rendimiento
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
        {view === 'mi-dia' && <MiDia onNavigate={handleNavigate} />}
        {view === 'seguimiento' && (
          <FollowUpView
            initialFilter={viewFilter?.type === 'seguimiento' ? viewFilter : null}
            onClearFilter={() => setViewFilter(null)}
          />
        )}
        {view === 'clients' && (
          <ClientTable
            initialFilter={['estatus', 'temperatura', 'sugerencia', 'disposition', 'vendedor', 'search'].includes(viewFilter?.type) ? viewFilter : null}
            onClearFilter={() => setViewFilter(null)}
          />
        )}
        {view === 'vendedores' && <VendedorView onNavigate={handleNavigate} />}
        {view === 'rendimiento' && <MiRendimiento />}
        {view === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
      </main>
      <ChatAssistant />
    </div>
  );
}

export default App;

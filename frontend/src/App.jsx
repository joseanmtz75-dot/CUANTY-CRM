import { useState, useCallback } from 'react';
import AppLayout from './components/layout/AppLayout';
import MiDia from './components/MiDia';
import FollowUpView from './components/FollowUpView';
import Dashboard from './components/Dashboard';
import ClientTable from './components/ClientTable';
import VendedorView from './components/VendedorView';
import MiRendimiento from './components/MiRendimiento';
import ChatAssistant from './components/ChatAssistant';
import AlertasPanel from './components/AlertasPanel';
import PartidoDelDia from './components/PartidoDelDia';

const VIEW_TITLES = {
  'mi-dia': 'Mi Dia',
  'partido': 'Partido del Día',
  'seguimiento': 'Seguimiento',
  'clients': 'Clientes',
  'vendedores': 'Vendedores',
  'rendimiento': 'Rendimiento',
  'dashboard': 'Dashboard',
};

function App() {
  const [view, setView] = useState('mi-dia');
  const [viewFilter, setViewFilter] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  const handleNavigate = (targetView, filter) => {
    setView(targetView);
    setViewFilter(filter || null);
  };

  const handleNavClick = (targetView) => {
    setView(targetView);
    setViewFilter(null);
  };

  const handleOpenChat = useCallback(() => setChatOpen(true), []);
  const handleCloseChat = useCallback(() => setChatOpen(false), []);

  return (
    <AppLayout
      currentView={view}
      onNavigate={handleNavClick}
      title={VIEW_TITLES[view]}
      onOpenChat={handleOpenChat}
      headerExtra={
        <AlertasPanel
          onViewClient={(id, nombre) =>
            handleNavigate('clients', { type: 'search', value: nombre, label: nombre })
          }
        />
      }
    >
      {view === 'mi-dia' && <MiDia onNavigate={handleNavigate} />}
      {view === 'partido' && <PartidoDelDia />}
      {view === 'seguimiento' && (
        <FollowUpView
          initialFilter={viewFilter?.type === 'seguimiento' ? viewFilter : null}
          onClearFilter={() => setViewFilter(null)}
        />
      )}
      {view === 'clients' && (
        <ClientTable
          initialFilter={
            ['estatus', 'temperatura', 'sugerencia', 'disposition', 'vendedor', 'search'].includes(viewFilter?.type)
              ? viewFilter
              : null
          }
          onClearFilter={() => setViewFilter(null)}
        />
      )}
      {view === 'vendedores' && <VendedorView onNavigate={handleNavigate} />}
      {view === 'rendimiento' && <MiRendimiento />}
      {view === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}

      <ChatAssistant isOpen={chatOpen} onClose={handleCloseChat} onOpen={handleOpenChat} />
    </AppLayout>
  );
}

export default App;

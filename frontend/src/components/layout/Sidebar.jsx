import {
  Sun,
  Clock,
  Users,
  UserCheck,
  TrendingUp,
  LayoutDashboard,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePartidoPendientes } from '../PartidoDelDia';

const NAV_ITEMS = [
  { key: 'mi-dia', label: 'Mi Dia', icon: Sun },
  { key: 'partido', label: 'Partido del Día', icon: Trophy },
  { key: 'seguimiento', label: 'Seguimiento', icon: Clock },
  { key: 'clients', label: 'Clientes', icon: Users },
  { key: 'vendedores', label: 'Vendedores', icon: UserCheck },
  { key: 'rendimiento', label: 'Rendimiento', icon: TrendingUp },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function Sidebar({ currentView, onNavigate, collapsed, onToggleCollapse, onOpenChat }) {
  const turnosPendientes = usePartidoPendientes();
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-[#001529] text-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-white/10 shrink-0">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">CUANTY CRM</span>
        )}
        {collapsed && (
          <span className="text-lg font-bold mx-auto">C</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const showBadge = key === 'partido' && turnosPendientes != null && turnosPendientes > 0;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                'hover:bg-white/10',
                currentView === key
                  ? 'bg-white/15 text-white'
                  : 'text-white/70'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="flex-1 text-left">{label}</span>}
              {showBadge && !collapsed && (
                <span className="min-w-[20px] h-[18px] px-1 rounded-full bg-[#D4A017] text-[#0F1F0A] text-[10px] font-bold flex items-center justify-center">
                  {turnosPendientes}
                </span>
              )}
              {showBadge && collapsed && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full bg-[#D4A017] text-[#0F1F0A] text-[9px] font-bold flex items-center justify-center">
                  {turnosPendientes > 9 ? '9+' : turnosPendientes}
                </span>
              )}
            </button>
          );
        })}

        {/* Chat assistant trigger */}
        <button
          onClick={onOpenChat}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            'hover:bg-white/10 text-white/70'
          )}
        >
          <Bot className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Asistente IA</span>}
        </button>
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-white/10 shrink-0">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-full p-2 rounded-lg hover:bg-white/10 text-white/70 transition-colors"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </button>
      </div>
    </aside>
  );
}

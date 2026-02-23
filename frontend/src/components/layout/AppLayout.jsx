import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '@/lib/utils';

export default function AppLayout({ currentView, onNavigate, title, children, onOpenChat, headerExtra }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f0f2f5]">
      <Sidebar
        currentView={currentView}
        onNavigate={onNavigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
        onOpenChat={onOpenChat}
      />
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300',
          collapsed ? 'ml-16' : 'ml-60'
        )}
      >
        <Header title={title}>
          {headerExtra}
        </Header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

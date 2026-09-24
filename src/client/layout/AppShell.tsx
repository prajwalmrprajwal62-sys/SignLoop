import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { PrimaryNav } from './PrimaryNav';

export function AppShell() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #111827 100%)' }}>
      {/* Skip to main content for keyboard / screen-reader users (WCAG 2.2 AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-400 focus:text-zinc-950 focus:rounded-md focus:font-semibold focus:outline-none"
      >
        Skip to main content
      </a>
      <TopBar />
      <PrimaryNav />
      <main id="main-content" className="pt-28 px-4 pb-12 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}

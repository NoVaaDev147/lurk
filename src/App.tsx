import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import Notes from "./pages/Notes";
import Tasks from "./pages/Tasks";
import Session from "./pages/Session";
import Settings from "./pages/Settings";

function NavItem({ to, icon, label, end }: { to: string; icon: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex flex-col items-center gap-1 w-full py-3 px-2 transition-all duration-200 group ${
          isActive ? "text-violet-400" : "text-zinc-600 hover:text-zinc-300"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-violet-500 rounded-r-full" />
          )}
          <span className="text-lg transition-transform duration-200 group-hover:scale-110">{icon}</span>
          <span className="text-[10px] font-medium tracking-wide uppercase">{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function App() {
  async function toggleOverlay() {
    await invoke("toggle_overlay");
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
        {/* Sidebar */}
        <nav className="flex flex-col w-16 bg-zinc-950 border-r border-zinc-800/50 items-center pt-5 pb-4">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center mb-1">
              <span className="text-white text-xs font-black tracking-tighter">LK</span>
            </div>
          </div>

          {/* Nav items */}
          <div className="flex flex-col w-full flex-1 gap-1">
            <NavItem to="/" icon="📝" label="Notes" end />
            <NavItem to="/tasks" icon="✅" label="Tasks" />
            <NavItem to="/session" icon="⏱️" label="Session" />
            <NavItem to="/settings" icon="⚙️" label="Settings" />
          </div>

          {/* Overlay toggle */}
          <button
            onClick={toggleOverlay}
            className="flex flex-col items-center gap-1 w-full py-3 px-2 text-zinc-600 hover:text-violet-400 transition-all duration-200 group"
          >
            <span className="text-lg transition-transform duration-200 group-hover:scale-110">👁️</span>
            <span className="text-[10px] font-medium tracking-wide uppercase">Overlay</span>
          </button>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-zinc-950">
          <Routes>
            <Route path="/" element={<Notes />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/session" element={<Session />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
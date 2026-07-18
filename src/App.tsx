import React, { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import ClassRecordList from "./pages/ClassRecordList";
import Gradebook from "./pages/Gradebook";
import Archive from "./pages/Archive";
import Settings from "./pages/Settings";

type Page =
  | { name: "dashboard" }
  | { name: "classRecord" }
  | { name: "gradebook"; classId: string }
  | { name: "archive" }
  | { name: "settings" };

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

export default function App() {
  const [page, setPage] = useState<Page>({ name: "dashboard" });
  const { theme, toggle } = useTheme();

  const isActive = (name: Page["name"]) => page.name === name;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">E-Class Record</div>
        <nav className="sidebar-nav">
          <button
            className={`sidebar-link ${isActive("dashboard") ? "active" : ""}`}
            onClick={() => setPage({ name: "dashboard" })}
          >
            📊 Dashboard
          </button>
          <button
            className={`sidebar-link ${isActive("classRecord") || isActive("gradebook") ? "active" : ""}`}
            onClick={() => setPage({ name: "classRecord" })}
          >
            📘 Class Record
          </button>
          <button
            className={`sidebar-link ${isActive("archive") ? "active" : ""}`}
            onClick={() => setPage({ name: "archive" })}
          >
            🗄️ Archived Records
          </button>
          <div style={{ flex: 1 }} />
          <button
            className={`sidebar-link ${isActive("settings") ? "active" : ""}`}
            onClick={() => setPage({ name: "settings" })}
          >
            ⚙️ Settings
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="theme-toggle">
            <span>{theme === "dark" ? "🌙 Dark" : "☀️ Light"}</span>
            <button className="btn btn-sm" onClick={toggle}>
              Switch
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {page.name === "dashboard" && (
          <Dashboard onOpenClass={(id) => setPage({ name: "gradebook", classId: id })} />
        )}
        {page.name === "classRecord" && (
          <ClassRecordList onOpenClass={(id) => setPage({ name: "gradebook", classId: id })} />
        )}
        {page.name === "gradebook" && (
          <Gradebook classId={page.classId} onBack={() => setPage({ name: "classRecord" })} />
        )}
        {page.name === "archive" && (
          <Archive onOpenClass={(id) => setPage({ name: "gradebook", classId: id })} />
        )}
        {page.name === "settings" && <Settings />}
      </main>
    </div>
  );
}

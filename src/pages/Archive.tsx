import React, { useEffect, useState } from "react";
import { api, ClassRecord } from "../lib/api";

export default function Archive({ onOpenClass }: { onOpenClass: (id: string) => void }) {
  const [classes, setClasses] = useState<ClassRecord[]>([]);

  const load = () => api.listClasses("archived").then(setClasses);
  useEffect(() => {
    load();
  }, []);

  const restore = async (id: string) => {
    await api.setClassStatus(id, "ongoing");
    load();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    await api.deleteClass(id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Archived Records</div>
      </div>

      {classes.length === 0 && (
        <div className="empty-state card">
          No archived classes. Completed classes moved from Class Record will appear here as read-only.
        </div>
      )}

      <div className="card-grid">
        {classes.map((c) => (
          <div key={c.id} className="card class-card" onClick={() => onOpenClass(c.id)}>
            <div className="class-card-title">{c.name}</div>
            <div className="class-card-meta">
              {c.subject} <br />
              {c.semester} {c.school_year} <br />
              {c.student_count} student{c.student_count === 1 ? "" : "s"} — <span className="pill pill-yellow">Read-only</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
              <button className="btn btn-sm" onClick={() => restore(c.id)}>Restore to Ongoing</button>
              <button className="btn btn-sm btn-danger" onClick={() => remove(c.id, c.name)}>Delete Permanently</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

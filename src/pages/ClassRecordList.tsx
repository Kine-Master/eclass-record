import React, { useEffect, useState } from "react";
import { api, ClassRecord } from "../lib/api";
import ClassFormModal from "../components/ClassFormModal";

export default function ClassRecordList({ onOpenClass }: { onOpenClass: (id: string) => void }) {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ClassRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .listClasses("ongoing")
      .then(setClasses)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Class Record</div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
        >
          + Add Class Record
        </button>
      </div>

      {!loading && classes.length === 0 && (
        <div className="empty-state card">
          No ongoing classes yet. Click <b>"+ Add Class Record"</b> to create your first gradebook.
        </div>
      )}

      <div className="card-grid">
        {classes.map((c) => (
          <div key={c.id} className="card class-card" onClick={() => onOpenClass(c.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="class-card-title">{c.name}</div>
              <button
                className="icon-btn"
                title="Edit class details"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(c);
                  setShowModal(true);
                }}
              >
                ✏️
              </button>
            </div>
            <div className="class-card-meta">
              {c.subject && <>{c.subject} <br /></>}
              {c.code && <>Code: {c.code} <br /></>}
              {c.department && <>{c.department} <br /></>}
              {c.semester} {c.school_year} <br />
              {c.schedule} <br />
              {c.student_count} student{c.student_count === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ClassFormModal
          existing={editing}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}

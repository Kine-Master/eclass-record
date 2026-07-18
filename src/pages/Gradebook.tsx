import React, { useEffect, useMemo, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { api, Assessment, GradebookData, Student } from "../lib/api";
import ClassFormModal from "../components/ClassFormModal";
import AssessmentModal from "../components/AssessmentModal";
import StudentModal from "../components/StudentModal";

type SortKey = "student_number" | "last_name" | "first_name" | "middle_name";

export default function Gradebook({ classId, onBack }: { classId: string; onBack: () => void }) {
  const [gb, setGb] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("last_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [showClassModal, setShowClassModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pendingScores, setPendingScores] = useState<Record<string, string>>({});

  const readOnly = gb?.class.status === "archived";

  const load = () => {
    setLoading(true);
    api
      .getGradebook(classId)
      .then(setGb)
      .finally(() => setLoading(false));
  };

  useEffect(load, [classId]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? "▲" : "▼") : "");

  const filteredSorted = useMemo(() => {
    if (!gb) return [];
    const q = search.trim().toLowerCase();
    let list = gb.students.filter((s) => {
      if (!q) return true;
      return (
        s.last_name.toLowerCase().includes(q) ||
        s.first_name.toLowerCase().includes(q) ||
        (s.middle_name ?? "").toLowerCase().includes(q) ||
        (s.student_number ?? "").toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      const av = (a[sortKey] ?? "").toString().toLowerCase();
      const bv = (b[sortKey] ?? "").toString().toLowerCase();
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [gb, search, sortKey, sortDir]);

  const scoreFor = (studentId: string, assessmentId: string): string => {
    const key = `${studentId}:${assessmentId}`;
    if (key in pendingScores) return pendingScores[key];
    const sc = gb?.scores.find((s) => s.student_id === studentId && s.assessment_id === assessmentId);
    return sc?.score != null ? String(sc.score) : "";
  };

  const onScoreChange = (studentId: string, assessmentId: string, value: string) => {
    setPendingScores((prev) => ({ ...prev, [`${studentId}:${assessmentId}`]: value }));
  };

  const commitScore = async (studentId: string, assessmentId: string, value: string) => {
    const score = value.trim() === "" ? null : Number(value);
    await api.saveScore({ student_id: studentId, assessment_id: assessmentId, score });
    load();
  };

  const resultFor = (studentId: string) => gb?.results.find((r) => r.student_id === studentId);

  const remarksPill = (remarks: string) => {
    const cls = remarks === "Passed" ? "pill-green" : remarks === "Failed" ? "pill-red" : "pill-yellow";
    return <span className={`pill ${cls}`}>{remarks}</span>;
  };

  const doExport = async (kind: "xlsx" | "pdf") => {
    if (!gb) return;
    const suggested = `${gb.class.name.replace(/[^\w-]+/g, "_")}.${kind}`;
    const path = await save({
      defaultPath: suggested,
      filters: [{ name: kind.toUpperCase(), extensions: [kind] }],
    });
    if (!path) return;
    setExporting(true);
    try {
      if (kind === "xlsx") await api.exportXlsx(classId, path);
      else await api.exportPdf(classId, path);
    } catch (err) {
      alert(`Export failed: ${err}`);
    } finally {
      setExporting(false);
    }
  };

  const archiveClass = async () => {
    if (!gb) return;
    if (!confirm("Move this class to Archive? It will become read-only.")) return;
    await api.setClassStatus(classId, "archived");
    load();
  };

  if (loading || !gb) {
    return <div className="empty-state">Loading gradebook...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-sm btn-ghost" onClick={onBack}>← Back to Class Record</button>
          <div className="page-title" style={{ marginTop: 6 }}>{gb.class.name}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!readOnly && (
            <button className="btn" onClick={() => setShowClassModal(true)}>✏️ Edit Class</button>
          )}
          {!readOnly && (
            <button className="btn" onClick={archiveClass}>🗄️ Move to Archive</button>
          )}
          <button className="btn" disabled={exporting} onClick={() => doExport("pdf")}>Export PDF</button>
          <button className="btn" disabled={exporting} onClick={() => doExport("xlsx")}>Export XLSX</button>
        </div>
      </div>

      <div className="gb-meta-bar">
        <span>Code: <b>{gb.class.code || "—"}</b></span>
        <span>Subject: <b>{gb.class.subject || "—"}</b></span>
        <span>Department: <b>{gb.class.department || "—"}</b></span>
        <span>Semester: <b>{gb.class.semester || "—"} {gb.class.school_year || ""}</b></span>
        <span>Schedule: <b>{gb.class.schedule || "—"}</b></span>
        {readOnly && <span className="pill pill-yellow">Archived / Read-only</span>}
      </div>

      <div className="gb-toolbar">
        <input
          className="gb-search"
          placeholder="Search students by name or number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8 }}>
          {!readOnly && (
            <>
              <button className="btn btn-sm" onClick={() => { setEditingStudent(null); setShowStudentModal(true); }}>
                + Add Student
              </button>
              <button
                className="btn btn-sm"
                onClick={() => { setEditingAssessment(null); setShowAssessmentModal(true); }}
              >
                + Add Column
              </button>
            </>
          )}
        </div>
      </div>

      <div className="gb-scroll">
        <table className="gb-table">
          <thead>
            <tr>
              <th className="frozen">No.</th>
              <th className="frozen">
                <button className="sort-btn" onClick={() => toggleSort("student_number")}>
                  Student No. {sortArrow("student_number")}
                </button>
              </th>
              <th className="frozen">
                <button className="sort-btn" onClick={() => toggleSort("last_name")}>
                  Last Name {sortArrow("last_name")}
                </button>
              </th>
              <th>
                <button className="sort-btn" onClick={() => toggleSort("first_name")}>
                  First Name {sortArrow("first_name")}
                </button>
              </th>
              <th>
                <button className="sort-btn" onClick={() => toggleSort("middle_name")}>
                  Middle Name {sortArrow("middle_name")}
                </button>
              </th>
              {gb.assessments.map((a) => {
                const cat = gb.categories.find((c) => c.id === a.category_id);
                return (
                  <th key={a.id}>
                    <button
                      className="col-header-btn"
                      disabled={readOnly}
                      onClick={() => { setEditingAssessment(a); setShowAssessmentModal(true); }}
                      title={readOnly ? undefined : "Click to edit or delete this column"}
                    >
                      {a.name}
                      <div className="col-sub">{cat?.name} · /{a.total_items}</div>
                    </button>
                  </th>
                );
              })}
              <th>Points</th>
              <th>Sem. Grade</th>
              <th>Letter</th>
              <th>Remarks</th>
              {!readOnly && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filteredSorted.map((st, idx) => {
              const result = resultFor(st.id);
              return (
                <tr key={st.id}>
                  <td className="frozen">{idx + 1}</td>
                  <td className="frozen">{st.student_number || "—"}</td>
                  <td className="frozen">{st.last_name}</td>
                  <td>{st.first_name}</td>
                  <td>{st.middle_name || "—"}</td>
                  {gb.assessments.map((a) => (
                    <td key={a.id}>
                      <input
                        className="score-input"
                        type="number"
                        disabled={readOnly}
                        value={scoreFor(st.id, a.id)}
                        placeholder="—"
                        onChange={(e) => onScoreChange(st.id, a.id, e.target.value)}
                        onBlur={(e) => commitScore(st.id, a.id, e.target.value)}
                      />
                    </td>
                  ))}
                  <td>{result ? result.points_equivalent.toFixed(1) : "—"}</td>
                  <td>{result ? result.semester_grade.toFixed(2) : "—"}</td>
                  <td>{result?.letter_equivalent ?? "—"}</td>
                  <td>{result ? remarksPill(result.remarks) : "—"}</td>
                  {!readOnly && (
                    <td>
                      <button className="icon-btn" title="Edit student" onClick={() => { setEditingStudent(st); setShowStudentModal(true); }}>✏️</button>
                    </td>
                  )}
                </tr>
              );
            })}
            {filteredSorted.length === 0 && (
              <tr>
                <td colSpan={20} style={{ textAlign: "center", padding: 24, color: "var(--subtext0)" }}>
                  {gb.students.length === 0
                    ? 'No students yet. Click "+ Add Student" to build the roster.'
                    : "No students match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showClassModal && (
        <ClassFormModal existing={gb.class} onClose={() => setShowClassModal(false)} onSaved={load} />
      )}
      {showAssessmentModal && (
        <AssessmentModal
          classId={classId}
          categories={gb.categories}
          existing={editingAssessment}
          onClose={() => setShowAssessmentModal(false)}
          onSaved={load}
        />
      )}
      {showStudentModal && (
        <StudentModal
          classId={classId}
          existing={editingStudent}
          onClose={() => setShowStudentModal(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}

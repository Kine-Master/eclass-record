import React, { useEffect, useState } from "react";
import { api, ClassRecord, GradebookData } from "../lib/api";

interface ClassSummary {
  cls: ClassRecord;
  gb: GradebookData;
  avg: number;
  incCount: number;
}

export default function Dashboard({ onOpenClass }: { onOpenClass: (id: string) => void }) {
  const [summaries, setSummaries] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const classes = await api.listClasses("ongoing");
      const data = await Promise.all(
        classes.map(async (cls) => {
          const gb = await api.getGradebook(cls.id);
          const grades = gb.results.filter((r) => r.remarks !== "INC").map((r) => r.points_equivalent);
          const avg = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
          const incCount = gb.results.filter((r) => r.remarks === "INC").length;
          return { cls, gb, avg, incCount };
        })
      );
      setSummaries(data);
      setLoading(false);
    })();
  }, []);

  const totalStudents = summaries.reduce((a, s) => a + s.gb.students.length, 0);
  const totalPassed = summaries.reduce((a, s) => a + s.gb.results.filter((r) => r.remarks === "Passed").length, 0);
  const totalFailed = summaries.reduce((a, s) => a + s.gb.results.filter((r) => r.remarks === "Failed").length, 0);
  const totalInc = summaries.reduce((a, s) => a + s.incCount, 0);
  const topClass = [...summaries].sort((a, b) => b.avg - a.avg)[0];

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
      </div>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-value">{summaries.length}</div>
          <div className="stat-label">Ongoing Classes</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{totalStudents}</div>
          <div className="stat-label">Total Students</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value" style={{ color: "var(--green)" }}>{totalPassed}</div>
          <div className="stat-label">Passed</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value" style={{ color: "var(--red)" }}>{totalFailed}</div>
          <div className="stat-label">Failed</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value" style={{ color: "var(--yellow)" }}>{totalInc}</div>
          <div className="stat-label">Incomplete (INC)</div>
        </div>
      </div>

      {topClass && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>🏆 Highest Class Average</div>
          <div style={{ color: "var(--subtext0)" }}>
            {topClass.cls.name} — average {topClass.avg.toFixed(1)} points
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 12, fontWeight: 700 }}>
        Students Missing Critical Requirements
      </div>
      <div className="card-grid">
        {summaries
          .filter((s) => s.incCount > 0)
          .map((s) => (
            <div key={s.cls.id} className="card class-card" onClick={() => onOpenClass(s.cls.id)}>
              <div className="class-card-title">{s.cls.name}</div>
              <div className="class-card-meta">
                <span className="pill pill-yellow">{s.incCount} student{s.incCount === 1 ? "" : "s"} flagged INC</span>
              </div>
            </div>
          ))}
        {!loading && summaries.every((s) => s.incCount === 0) && (
          <div className="empty-state card">No missing critical grades across your ongoing classes. 🎉</div>
        )}
      </div>
    </div>
  );
}

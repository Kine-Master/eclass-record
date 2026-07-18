import React, { useEffect, useState } from "react";
import { api, NewCategoryInput, PresetWithCategories } from "../lib/api";

const DEFAULT_CATEGORIES: NewCategoryInput[] = [
  { name: "Written Output", weight: 15, is_critical: false },
  { name: "Performance Tasks", weight: 25, is_critical: false },
  { name: "Midterm Exam", weight: 20, is_critical: true },
  { name: "Final Output", weight: 10, is_critical: true },
  { name: "Final Exam", weight: 25, is_critical: true },
  { name: "Attendance", weight: 5, is_critical: false },
];

export default function Settings() {
  const [presets, setPresets] = useState<PresetWithCategories[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<NewCategoryInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const list = await api.listPresets();
    setPresets(list);
    if (list.length && !selectedId) {
      selectPreset(list[0]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectPreset = (p: PresetWithCategories) => {
    setSelectedId(p.preset.id);
    setName(p.preset.name);
    setCategories(p.categories.map((c) => ({ id: c.id, name: c.name, weight: c.weight, is_critical: c.is_critical })));
    setError(null);
  };

  const total = categories.reduce((a, c) => a + (Number(c.weight) || 0), 0);

  const updateCat = (idx: number, patch: Partial<NewCategoryInput>) => {
    setCategories((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const addCat = () => setCategories((prev) => [...prev, { name: "New Criteria", weight: 0, is_critical: false }]);
  const removeCat = (idx: number) => setCategories((prev) => prev.filter((_, i) => i !== idx));

  const resetToDefault = () => {
    setName("University Default (Type 1)");
    setCategories(DEFAULT_CATEGORIES.map((c) => ({ ...c })));
  };

  const newPreset = () => {
    setSelectedId(null);
    setName("New Grading Preset");
    setCategories(DEFAULT_CATEGORIES.map((c) => ({ ...c, id: null })));
  };

  const save = async () => {
    setError(null);
    if (Math.abs(total - 100) > 0.01) {
      setError(`Weights must total 100% (currently ${total.toFixed(1)}%).`);
      return;
    }
    setSaving(true);
    try {
      const id = await api.savePreset(selectedId, name, categories);
      await load();
      const refreshed = await api.listPresets();
      const match = refreshed.find((p) => p.preset.id === id);
      if (match) selectPreset(match);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Settings</div>
        <button className="btn btn-primary" onClick={newPreset}>+ New Preset</button>
      </div>

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
        <div className="card" style={{ width: 220 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Grading Presets</div>
          {presets.map((p) => (
            <button
              key={p.preset.id}
              className={`sidebar-link ${selectedId === p.preset.id ? "active" : ""}`}
              style={{ width: "100%", marginBottom: 4 }}
              onClick={() => selectPreset(p)}
            >
              {p.preset.name}
            </button>
          ))}
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div className="form-row">
            <label>Preset Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div style={{ color: "var(--subtext0)", fontSize: 12.5, marginBottom: 10 }}>
            Define computation categories (criteria) and weights. Weights must total 100%. Toggle{" "}
            <b>Critical</b> for categories (e.g. Midterm, Final Exam) where a missing grade should flag
            the student's Remarks as <b>INC</b> instead of scoring as 0.
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--subtext0)", fontSize: 12 }}>
                <th style={{ padding: "4px 6px" }}>Criteria</th>
                <th style={{ padding: "4px 6px", width: 100 }}>Weight %</th>
                <th style={{ padding: "4px 6px", width: 90 }}>Critical</th>
                <th style={{ padding: "4px 6px", width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c, idx) => (
                <tr key={idx}>
                  <td style={{ padding: "4px 6px" }}>
                    <input value={c.name} onChange={(e) => updateCat(idx, { name: e.target.value })} />
                  </td>
                  <td style={{ padding: "4px 6px" }}>
                    <input
                      type="number"
                      value={c.weight}
                      onChange={(e) => updateCat(idx, { weight: Number(e.target.value) })}
                      style={{ width: 70 }}
                    />
                  </td>
                  <td style={{ padding: "4px 6px" }}>
                    <input
                      type="checkbox"
                      checked={c.is_critical}
                      onChange={(e) => updateCat(idx, { is_critical: e.target.checked })}
                    />
                  </td>
                  <td style={{ padding: "4px 6px" }}>
                    <button className="icon-btn danger" onClick={() => removeCat(idx)} title="Remove criteria">✕</button>
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{ padding: "6px", fontWeight: 700 }}>Total</td>
                <td style={{ padding: "6px", fontWeight: 700, color: Math.abs(total - 100) > 0.01 ? "var(--red)" : "var(--green)" }}>
                  {total.toFixed(1)}%
                </td>
                <td /><td />
              </tr>
            </tbody>
          </table>

          {error && <div className="form-error">{error}</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={addCat}>+ Add Criteria</button>
            <button className="btn" onClick={resetToDefault}>Reset to Default</button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Preset"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

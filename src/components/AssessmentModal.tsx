import React, { useState } from "react";
import { api, Assessment, NewAssessmentInput, PresetCategory } from "../lib/api";

export default function AssessmentModal({
  classId,
  categories,
  existing,
  onClose,
  onSaved,
}: {
  classId: string;
  categories: PresetCategory[];
  existing?: Assessment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<NewAssessmentInput>({
    id: existing?.id ?? null,
    category_id: existing?.category_id ?? categories[0]?.id ?? "",
    name: existing?.name ?? "",
    total_items: existing?.total_items ?? 10,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError("Column name is required.");
      return;
    }
    if (!form.total_items || form.total_items <= 0) {
      setError("Total items must be greater than 0.");
      return;
    }
    setSaving(true);
    try {
      await api.saveAssessment(classId, form);
      onSaved();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    if (!confirm(`Delete column "${existing.name}"? All scores in this column will be removed.`)) return;
    setSaving(true);
    try {
      await api.deleteAssessment(existing.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 380 }}>
        <div className="modal-title">{existing ? "Edit Column" : "Add Column"}</div>

        <div className="form-row">
          <label>Column Name (e.g. Quiz 1, Recitation 2)</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>

        <div className="form-row-2">
          <div className="form-row">
            <label>Total Items / Perfect Score</label>
            <input
              type="number"
              value={form.total_items}
              onChange={(e) => setForm({ ...form, total_items: Number(e.target.value) })}
            />
          </div>
          <div className="form-row">
            <label>Category</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.weight}%)</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          {existing && (
            <button className="btn btn-danger" onClick={remove} disabled={saving} style={{ marginRight: "auto" }}>
              Delete Column
            </button>
          )}
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

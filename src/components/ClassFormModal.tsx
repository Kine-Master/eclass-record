import React, { useEffect, useState } from "react";
import { api, ClassRecord, NewClassInput, PresetWithCategories } from "../lib/api";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ClassFormModal({
  existing,
  onClose,
  onSaved,
}: {
  existing?: ClassRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [presets, setPresets] = useState<PresetWithCategories[]>([]);
  const [form, setForm] = useState<NewClassInput>({
    name: existing?.name ?? "",
    code: existing?.code ?? "",
    subject: existing?.subject ?? "",
    department: existing?.department ?? "",
    semester: existing?.semester ?? "First Sem",
    school_year: existing?.school_year ?? "",
    schedule: existing?.schedule ?? "",
    preset_id: existing?.preset_id ?? "preset-default",
  });
  const [selectedDays, setSelectedDays] = useState<string[]>(
    (existing?.schedule ?? "").split("-").filter(Boolean)
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listPresets().then(setPresets).catch((err) => setError(String(err)));
  }, []);

  const toggleDay = (d: string) => {
    setSelectedDays((prev) => {
      const next = prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d];
      setForm((f) => ({ ...f, schedule: next.join("-") }));
      return next;
    });
  };

  const set = (k: keyof NewClassInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError("Class name is required.");
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await api.updateClass(existing.id, form);
      } else {
        await api.createClass(form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{existing ? "Edit Class Record" : "Add Class Record"}</div>

        <div className="form-row">
          <label>Class Name (e.g. BSBA - 1A)</label>
          <input value={form.name} onChange={set("name")} placeholder="BSBA - 1A" />
        </div>

        <div className="form-row-2">
          <div className="form-row">
            <label>Class Code</label>
            <input value={form.code ?? ""} onChange={set("code")} placeholder="12230300" />
          </div>
          <div className="form-row">
            <label>Subject</label>
            <input value={form.subject ?? ""} onChange={set("subject")} placeholder="Ethics" />
          </div>
        </div>

        <div className="form-row-2">
          <div className="form-row">
            <label>Semester</label>
            <select value={form.semester ?? ""} onChange={set("semester")}>
              <option>First Sem</option>
              <option>Second Sem</option>
              <option>Summer</option>
            </select>
          </div>
          <div className="form-row">
            <label>School Year</label>
            <input value={form.school_year ?? ""} onChange={set("school_year")} placeholder="2026-2027" />
          </div>
        </div>

        <div className="form-row">
          <label>Department</label>
          <input value={form.department ?? ""} onChange={set("department")} placeholder="College of Science" />
        </div>

        <div className="form-row">
          <label>Schedule (check days of the week)</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                className={`btn btn-sm ${selectedDays.includes(d) ? "btn-primary" : ""}`}
                onClick={() => toggleDay(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label>Computation Type (Grading Preset)</label>
          <select value={form.preset_id} onChange={set("preset_id")}>
            {presets.map((p) => (
              <option key={p.preset.id} value={p.preset.id}>
                {p.preset.name}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : existing ? "Save Changes" : "Add Class Record"}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { api, NewStudentInput, Student } from "../lib/api";

export default function StudentModal({
  classId,
  existing,
  onClose,
  onSaved,
}: {
  classId: string;
  existing?: Student | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<NewStudentInput>({
    id: existing?.id ?? null,
    student_number: existing?.student_number ?? "",
    last_name: existing?.last_name ?? "",
    first_name: existing?.first_name ?? "",
    middle_name: existing?.middle_name ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    if (!form.last_name.trim() || !form.first_name.trim()) {
      setError("Last name and first name are required.");
      return;
    }
    setSaving(true);
    try {
      await api.saveStudent(classId, form);
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
    if (!confirm(`Remove ${existing.last_name}, ${existing.first_name} from this class? This deletes all of their scores.`)) return;
    setSaving(true);
    try {
      await api.deleteStudent(existing.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 400 }}>
        <div className="modal-title">{existing ? "Edit Student" : "Add Student"}</div>

        <div className="form-row">
          <label>Student Number</label>
          <input
            value={form.student_number ?? ""}
            onChange={(e) => setForm({ ...form, student_number: e.target.value })}
          />
        </div>
        <div className="form-row-2">
          <div className="form-row">
            <label>Last Name</label>
            <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <div className="form-row">
            <label>First Name</label>
            <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <label>Middle Name</label>
          <input value={form.middle_name ?? ""} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="modal-actions">
          {existing && (
            <button className="btn btn-danger" onClick={remove} disabled={saving} style={{ marginRight: "auto" }}>
              Delete Student
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

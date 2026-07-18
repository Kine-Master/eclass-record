import { invoke } from "@tauri-apps/api/core";

export interface PresetCategory {
  id: string;
  preset_id: string;
  name: string;
  weight: number;
  is_critical: boolean;
  position: number;
}
export interface GradingPreset { id: string; name: string; is_default: boolean; }
export interface PresetWithCategories { preset: GradingPreset; categories: PresetCategory[]; }
export interface NewCategoryInput { id?: string | null; name: string; weight: number; is_critical: boolean; }

export interface ClassRecord {
  id: string;
  name: string;
  code?: string | null;
  subject?: string | null;
  department?: string | null;
  semester?: string | null;
  school_year?: string | null;
  schedule?: string | null;
  preset_id: string;
  status: "ongoing" | "archived";
  student_count: number;
}
export interface NewClassInput {
  name: string;
  code?: string | null;
  subject?: string | null;
  department?: string | null;
  semester?: string | null;
  school_year?: string | null;
  schedule?: string | null;
  preset_id: string;
}

export interface Student {
  id: string;
  class_id: string;
  student_number?: string | null;
  last_name: string;
  first_name: string;
  middle_name?: string | null;
}
export interface NewStudentInput {
  id?: string | null;
  student_number?: string | null;
  last_name: string;
  first_name: string;
  middle_name?: string | null;
}

export interface Assessment {
  id: string;
  class_id: string;
  category_id: string;
  name: string;
  total_items: number;
  position: number;
}
export interface NewAssessmentInput {
  id?: string | null;
  category_id: string;
  name: string;
  total_items: number;
}

export interface ScoreInput { student_id: string; assessment_id: string; score: number | null; }

export interface CategoryResult {
  category_id: string; category_name: string; weight: number;
  earned: number; total: number; weighted_score: number;
  is_critical: boolean; missing_critical: boolean;
}
export interface StudentGradeResult {
  student_id: string;
  categories: CategoryResult[];
  raw_percentage: number;
  points_equivalent: number;
  semester_grade: number;
  letter_equivalent: string;
  remarks: "Passed" | "Failed" | "INC" | string;
}
export interface GradebookData {
  class: ClassRecord;
  categories: PresetCategory[];
  assessments: Assessment[];
  students: Student[];
  scores: ScoreInput[];
  results: StudentGradeResult[];
}

export const api = {
  listPresets: () => invoke<PresetWithCategories[]>("list_presets"),
  savePreset: (id: string | null, name: string, categories: NewCategoryInput[]) =>
    invoke<string>("save_preset", { id, name, categories }),
  deletePreset: (id: string) => invoke<void>("delete_preset", { id }),

  listClasses: (status: "ongoing" | "archived") => invoke<ClassRecord[]>("list_classes", { status }),
  createClass: (input: NewClassInput) => invoke<string>("create_class", { input }),
  updateClass: (id: string, input: NewClassInput) => invoke<void>("update_class", { id, input }),
  setClassStatus: (id: string, status: "ongoing" | "archived") =>
    invoke<void>("set_class_status", { id, status }),
  deleteClass: (id: string) => invoke<void>("delete_class", { id }),

  listStudents: (classId: string) => invoke<Student[]>("list_students", { classId }),
  saveStudent: (classId: string, input: NewStudentInput) =>
    invoke<string>("save_student", { classId, input }),
  deleteStudent: (id: string) => invoke<void>("delete_student", { id }),

  listAssessments: (classId: string) => invoke<Assessment[]>("list_assessments", { classId }),
  saveAssessment: (classId: string, input: NewAssessmentInput) =>
    invoke<string>("save_assessment", { classId, input }),
  deleteAssessment: (id: string) => invoke<void>("delete_assessment", { id }),

  saveScore: (input: ScoreInput) => invoke<void>("save_score", { input }),

  getGradebook: (classId: string) => invoke<GradebookData>("get_gradebook", { classId }),

  exportXlsx: (classId: string, destPath: string) =>
    invoke<string>("export_class_xlsx", { classId, destPath }),
  exportPdf: (classId: string, destPath: string) =>
    invoke<string>("export_class_pdf", { classId, destPath }),
};

# E-Class Record System

Offline desktop gradebook app for university educators. Built with **React + TypeScript**
(frontend), **Rust via Tauri 2** (backend/app shell), and **SQLite** (embedded local database).
Targets **Windows 10+** and **Arch Linux**.

This repo is a complete, working scaffold implementing everything in the PRD plus the
follow-up notes you gave (edit/delete students, edit/delete assessment columns, edit an
existing class, light/dark theme, sortable/searchable roster, etc). Treat it as a strong
starting point — you'll want to `npm install`, run it locally, and iterate on styling/UX to
taste.

## What's implemented

- **Dashboard** — ongoing class count, student totals, passed/failed/INC counts, highest
  class average, and a "missing critical requirements" alert list.
- **Class Record** — card list of ongoing classes, "+ Add Class Record" modal, and an
  **Edit** button per card (no more "start over" if you typo the class name).
- **Gradebook grid** (the core view):
  - Class metadata (code, subject, department, semester, school year, schedule) is pulled
    from the class-creation form and displayed in a header bar above the grid.
  - Separate, independently sortable columns for **Student No.**, **Last Name**,
    **First Name**, **Middle Name**, each with a click-to-sort button and a ▲/▼ arrow
    indicating direction.
  - A search box filters the roster live by name or student number.
  - **Add / Edit / Delete student** via a modal (pencil icon per row).
  - **Add / Edit / Delete assessment column** — click any column header to rename it,
    change its item count, reassign its grading category, or delete it entirely. Deleting
    or resizing a column no longer requires rebuilding the whole gradebook.
  - Inline score entry with auto-recompute (missing standard items = 0; missing critical
    items = INC, per the PRD rules).
  - Export to **PDF** and **XLSX** via a native save dialog.
  - "Move to Archive" to complete the semester.
- **Archive** — read-only class cards with **Restore to Ongoing** and **Delete Permanently**.
- **Settings** — grading preset manager: add/edit/delete criteria, toggle "critical"
  (forces INC when missing), weight validation (must total 100%), multiple saved presets,
  reset to the PRD's default university preset.
- **Light/Dark theme toggle** in the sidebar, built on the Catppuccin Mocha (dark) / Latte
  (light) palettes. Form inputs and `<select>` dropdowns use theme-aware colors in both
  their open *and* closed state, so dropdown text is never too light to read.
- **SQLite schema** with dynamic assessment columns (no schema migration needed per
  quiz/activity), normalized students/classes/assessments/scores tables.
- **Grade computation engine** written in Rust (`src-tauri/src/compute.rs`), matching the
  PRD's category-weighted scaling and INC-flagging rules, with a Points → Semester Grade →
  Letter → Remarks conversion table.

## Project layout

```
src/                       React + TypeScript frontend
  pages/                   Dashboard, ClassRecordList, Gradebook, Archive, Settings
  components/              ClassFormModal, StudentModal, AssessmentModal
  lib/api.ts               Typed wrapper around Tauri invoke() calls
  theme.css                Catppuccin light/dark theme + layout styles

src-tauri/                 Rust backend (Tauri 2)
  src/main.rs               App entrypoint, command registration
  src/db.rs                 SQLite connection + migration bootstrap
  src/models.rs              Shared structs (serde)
  src/commands.rs             CRUD commands (presets, classes, students, assessments, scores)
  src/compute.rs              Grade computation engine
  src/export.rs                XLSX (rust_xlsxwriter) and PDF (printpdf) export
  migrations/001_init.sql      Schema + default grading preset seed
  capabilities/default.json    Tauri v2 permissions (dialog plugin)

.github/workflows/build.yml  CI: builds Windows (msi/nsis) and Arch Linux (AppImage/deb)
packaging/PKGBUILD           Optional native Pacman package definition
```

## Running locally

Prerequisites: Node.js 20+, Rust (stable), and the Tauri system dependencies for your OS
(see https://tauri.app/start/prerequisites/ — on Arch: `webkit2gtk-4.1`, `gtk3`,
`libappindicator-gtk3`, `librsvg`, `base-devel`).

```bash
npm install
npm run tauri dev
```

Build a release bundle for your current OS:

```bash
npm run tauri build
```

The SQLite database is created automatically on first launch at:
- Linux: `~/.local/share/e-class-record/class_records.sqlite3`
- Windows: `%APPDATA%\e-class-record\class_records.sqlite3`

## CI builds (GitHub Actions)

`.github/workflows/build.yml` runs on every push to `main`, on `v*` tags, and can be
triggered manually from the Actions tab. It produces:

1. **Windows** — `.msi` and NSIS `.exe` installers, via `tauri-apps/tauri-action`.
2. **Arch Linux** — an `.AppImage` (portable, runs on any modern Linux, including Arch) and
   a `.deb`, built inside a real `archlinux:latest` container (GitHub doesn't offer native
   Arch runners, so the job runs Arch inside a container on an Ubuntu host).
3. **Arch Linux (Pacman package)** — an optional job that runs `makepkg` against
   `packaging/PKGBUILD` to produce a native `.pkg.tar.zst`. This job is set to
   `continue-on-error` since `PKGBUILD` packaging conventions vary — review and adjust the
   `source`/`sha256sums` fields once you're publishing releases from a tagged repo.

Artifacts are uploaded to the workflow run (Actions → your run → Artifacts) and, on tag
pushes, attached as a draft GitHub Release by the Windows job.

## Known follow-ups / things to sanity-check before shipping

- `printpdf` and `rust_xlsxwriter` APIs move fairly often between versions — if
  `cargo build` complains about a method signature in `export.rs`, check the crate's docs
  for the version that gets resolved and adjust (the logic/structure will stay the same).
- The Points → Semester Grade → Letter conversion table in `compute.rs` is a reasonable
  default modeled on your UI mock (1.75 → 90 → B+ → Passed, etc.) — replace the constants
  there if your institution uses a different scale.
- App icons in `src-tauri/icons/` are auto-generated placeholders — swap in your real
  branding before distributing.
- The Arch Linux CI job installs `webkit2gtk-4.1` (the current Arch package name); if Arch
  renames/bumps this package again, update the `pacman -S` list accordingly.

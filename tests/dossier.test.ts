import test from "node:test";
import assert from "node:assert/strict";
import {
  dossierSections,
  dossierSources,
  withDossier,
  DOSSIER_ID,
} from "../lib/dossier";
import { initialWorkspace } from "../lib/seed";
import { workspaceSchema } from "../lib/workspace";
test("adding the example preserves existing notes, selections and active project; migration is idempotent", () => {
  const initial = initialWorkspace();
  const old = {
    ...initial,
    activeProject: "achille",
    projects: initial.projects
      .filter((p) => p.id !== "cabanel-1847")
      .map((p) => ({
        ...p,
        notes: "Mon travail personnel",
        selected: ["met-436105"],
      })),
    sources: initial.sources.filter(
      (s) => !dossierSources.some((d) => d.id === s.id),
    ),
  };
  const migrated = withDossier(old);
  assert.equal(migrated.activeProject, "achille");
  assert.deepEqual(
    migrated.projects.find((p) => p.id === "achille"),
    old.projects[0],
  );
  assert.deepEqual(withDossier(migrated), migrated);
  assert.equal(workspaceSchema.safeParse(migrated).success, true);
});
test("example references resolve, bibliographic access is explicit and export notes contain sources", () => {
  const w = initialWorkspace();
  assert.equal(w.activeProject, DOSSIER_ID);
  for (const section of dossierSections)
    for (const id of section.sources)
      assert.ok(
        w.sources.some((s) => s.id === id),
        id,
      );
  const p = w.projects.find((p) => p.id === DOSSIER_ID)!;
  for (const s of dossierSources) {
    assert.ok(p.selected.includes(s.id));
    assert.ok(p.notes.includes(s.url));
  }
  assert.equal(
    dossierSources.find((s) => s.id === "cabanel-catalogue")!.access,
    "Notice consultée",
  );
  assert.ok(p.notes.includes("livre non lu"));
});

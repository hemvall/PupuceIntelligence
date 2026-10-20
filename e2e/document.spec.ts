import { test, expect } from "@playwright/test";
import { initialWorkspace } from "../lib/seed";
import { readFile } from "node:fs/promises";
test("write a complete dossier, preserve edits, embed an image and download real Word/PDF exports", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((w) => {
    if (!localStorage.getItem("pupuce-workspace-v1"))
      localStorage.setItem("pupuce-workspace-v1", JSON.stringify(w));
    localStorage.setItem("pupuce-guide-seen", "1");
  }, initialWorkspace());
  let polls = 0;
  await page.route("**/api/hermes/runs", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.message).toContain("sections");
    expect(body.context).toContain("cabanel-fabre");
    await route.fulfill({ status: 202, json: { run_id: "writing-fixture" } });
  });
  await page.route("**/api/hermes/runs/writing-fixture", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ json: { status: "stopping" } });
      return;
    }
    polls++;
    await route.fulfill({
      json:
        polls === 1
          ? { status: "running" }
          : {
              status: "completed",
              output: JSON.stringify({
                title: "Cabanel et la figure de l’ange",
                sections: [
                  {
                    title: "Introduction",
                    paragraphs: [
                      "Le tableau de 1847 offre un point de départ pour étudier la représentation de la chute. Cette interprétation doit être confrontée aux sources.",
                    ],
                    sourceIds: ["cabanel-fabre"],
                  },
                  {
                    title: "Analyse de l’œuvre",
                    paragraphs: [
                      "La composition place le personnage replié au premier plan. Son étude peut distinguer description et hypothèse de lecture.",
                    ],
                    sourceIds: ["cabanel-fabre"],
                  },
                  {
                    title: "Conclusion",
                    paragraphs: [
                      "La lecture reste ouverte et doit conserver la distinction entre les documents consultés et les références encore à vérifier.",
                    ],
                    sourceIds: [],
                  },
                ],
              }),
            },
    });
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Mon document", exact: true }).click();
  await page
    .getByRole("button", { name: "Créer la structure", exact: true })
    .click();
  const editor = page.getByRole("textbox", {
    name: "Contenu du document",
    exact: true,
  });
  await editor.locator("p").first().click();
  await page.keyboard.type("Mon texte personnel à conserver.");
  await page
    .getByRole("button", { name: "Structure et rédaction", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Rédiger le dossier complet", exact: true })
    .click();
  await expect(
    page.getByText("L’assistant rédige le dossier", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Un brouillon à relire", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Aperçu du brouillon" }),
  ).toContainText("La composition");
  await page
    .getByRole("button", { name: "Revenir à mon document", exact: true })
    .click();
  await expect(editor).toContainText("Mon texte personnel à conserver.");
  await page
    .getByRole("button", { name: "Remplacer mon document", exact: true })
    .click();
  await expect(editor).toContainText("La composition");
  const imageCount = await editor.locator("img").count();
  expect(imageCount).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Image", exact: true }).click();
  await page
    .getByPlaceholder("Auteur, œuvre, date, source et droits…")
    .fill("Cabanel, L’Ange déchu, 1847. Rvalette, CC BY-SA 3.0.");
  await page
    .locator(".editor-insert input[type=file]")
    .setInputFiles("public/art/fallen-angel.jpg");
  await expect(editor.locator("img")).toHaveCount(imageCount + 1);
  await expect(editor).toContainText("Rvalette");
  await page
    .getByRole("textbox", { name: "Titre du document", exact: true })
    .fill("Cabanel — mon dossier");
  await editor.click();
  await expect(
    page.getByText("Enregistré sur cet appareil", { exact: true }),
  ).toBeVisible();
  await page.locator(".research-main").evaluate((el) => (el.scrollTop = 0));
  await page.screenshot({
    path: "test-results/document-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  for (const format of ["Word", "PDF"]) {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: format, exact: true }).click();
    const file = await download;
    const path = await file.path();
    const bytes = await readFile(path!);
    expect(bytes.subarray(0, format === "PDF" ? 5 : 2).toString()).toBe(
      format === "PDF" ? "%PDF-" : "PK",
    );
  }
  await page.reload();
  await page.getByRole("tab", { name: "Mon document", exact: true }).click();
  await expect(editor.locator("img")).toHaveCount(imageCount + 1);
  await expect(
    page.getByRole("textbox", { name: "Titre du document", exact: true }),
  ).toHaveValue("Cabanel — mon dossier");
  await page
    .getByRole("button", { name: "Version précédente", exact: true })
    .click();
  await expect(editor).toContainText("Mon texte personnel à conserver.");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page
        .locator(".sidebar")
        .evaluate((el) => el.getBoundingClientRect().right),
    )
    .toBeLessThanOrEqual(0);
  await page.locator(".research-main").evaluate((el) => (el.scrollTop = 0));
  await page.screenshot({
    path: "test-results/document-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("the Cabanel example becomes editable, exports, and restores from the old browser storage", async ({
  page,
}) => {
  await page.addInitScript((w) => {
    localStorage.setItem("pupuce-workspace-v1", JSON.stringify(w));
    localStorage.setItem("pupuce-guide-seen", "1");
  }, initialWorkspace());
  await page.goto("/");
  await page.getByRole("tab", { name: "Mon document", exact: true }).click();
  await page
    .getByRole("button", { name: "Partir du dossier Cabanel", exact: true })
    .click();
  const editor = page.getByRole("textbox", {
    name: "Contenu du document",
    exact: true,
  });
  await expect(editor.locator("img")).toHaveCount(1);
  await expect(editor).toContainText("Bibliographie et documents consultés");
  await expect(page.locator(".eyebrow")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/cabanel-document.png",
    fullPage: true,
    animations: "disabled",
  });
});

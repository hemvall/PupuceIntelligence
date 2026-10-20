import { test, expect } from '@playwright/test';
import { Document, Packer, Paragraph } from 'docx';
import PDFDocument from 'pdfkit';
import { initialWorkspace } from '../lib/seed';
test.use({ extraHTTPHeaders: { 'x-app-access-key': 'pupuce-e2e' } });
test('create a dossier with PDF and Word, restore it, then add and download an image', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(w => {
    if (!localStorage.getItem('pupuce-workspace-v1')) localStorage.setItem('pupuce-workspace-v1', JSON.stringify(w));
    localStorage.setItem('pupuce-guide-seen', '1');
  }, initialWorkspace());
  const pdf = new PDFDocument();
  const chunks: Buffer[] = [];
  const pdfDone = new Promise<Buffer>(resolve => { pdf.on('data', x => chunks.push(x)); pdf.on('end', () => resolve(Buffer.concat(chunks))); });
  pdf.text('Le mouvement Renaissance'); pdf.end();
  const word = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph('Mon cours sur Raphael')] }] }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Créer un dossier', exact: true }).click();
  await page.getByLabel('Sujet ou titre du dossier').fill('Mon corpus Renaissance');
  await page.getByLabel('Choisir des fichiers').setInputFiles([
    { name: 'Musee.pdf', mimeType: 'application/pdf', buffer: await pdfDone },
    { name: 'Cours.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: word },
  ]);
  await expect(page.getByText('Texte prêt pour l’assistant')).toHaveCount(2, { timeout: 30000 });
  await page.getByRole('button', { name: 'Créer le dossier', exact: true }).click();
  await page.getByRole('button', { name: 'Musee.pdf', exact: true }).click();
  await expect(page.locator('.course-preview')).toContainText('[Page 1]');
  await expect(page.locator('.course-preview')).toContainText('Renaissance');
  const savedDownload = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Télécharger l’original' }).click();
  expect((await savedDownload).suggestedFilename()).toBe('Musee.pdf');
  await page.getByRole('button', { name: 'Fermer la notice' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Mon corpus Renaissance/ })).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter des documents', exact: true }).first().click();
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5ioAAAAASUVORK5CYII=', 'base64');
  await page.getByLabel('Choisir des fichiers').setInputFiles({ name:'Tableau.png', mimeType:'image/png', buffer:image });
  await expect(page.getByText(/Image conservée/)).toBeVisible();
  await page.getByRole('dialog').screenshot({ path: '/tmp/pupuce-import.png' });
  await page.getByRole('button', { name:'Ajouter au dossier', exact:true }).click();
  await page.getByRole('button', { name:'Tableau.png', exact:true }).click();
  await expect(page.locator('.original-file img')).toBeVisible();
  await expect(page.getByText(/aucune lecture visuelle automatique/).first()).toBeVisible();
  expect(errors).toEqual([]);
});

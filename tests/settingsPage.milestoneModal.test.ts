import fs from 'node:fs';
import path from 'node:path';

describe('SettingsPage milestone editor modal', () => {
  const settingsPagePath = path.resolve(process.cwd(), 'src/pages/SettingsPage.tsx');

  it('renders the editing milestone modal block only once in source', () => {
    const source = fs.readFileSync(settingsPagePath, 'utf8');

    const modalRenderOccurrences = source.match(/\{editingMilestone\s*&&\s*\(/g) ?? [];

    expect(modalRenderOccurrences).toHaveLength(1);
  });

  it('hides inline milestone delete icon button on mobile breakpoints', () => {
    const source = fs.readFileSync(settingsPagePath, 'utf8');

    expect(source).toMatch(/className="[^"]*hidden sm:inline-flex[^"]*"/);
  });

  it('requires confirmation before deleting a milestone', () => {
    const source = fs.readFileSync(settingsPagePath, 'utf8');

    expect(source).toContain('window.confirm');
    expect(source).toContain('Delete milestone');
  });
});

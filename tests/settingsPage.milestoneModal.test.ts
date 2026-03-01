import fs from 'node:fs';
import path from 'node:path';

describe('SettingsPage milestone editor modal', () => {
  it('renders the editing milestone modal block only once in source', () => {
    const settingsPagePath = path.resolve(process.cwd(), 'src/pages/SettingsPage.tsx');
    const source = fs.readFileSync(settingsPagePath, 'utf8');

    const modalRenderOccurrences = source.match(/\{editingMilestone\s*&&\s*\(/g) ?? [];

    expect(modalRenderOccurrences).toHaveLength(1);
  });

  it('requires explicit confirmation before deleting milestone from card actions', () => {
    const settingsPagePath = path.resolve(process.cwd(), 'src/pages/SettingsPage.tsx');
    const source = fs.readFileSync(settingsPagePath, 'utf8');

    expect(source).toMatch(/const\s*\[\s*pendingDeleteMilestone\s*,\s*setPendingDeleteMilestone\s*\]/);
    expect(source).toMatch(/requestDeleteMilestone\s*\(\s*milestone\s*\)\s*;/);
    expect(source).toMatch(/Delete milestone\?/);
    expect(source).toMatch(/confirmDeleteMilestone/);
  });

  it('adds basic dialog semantics and keyboard dismissal for delete confirmation', () => {
    const settingsPagePath = path.resolve(process.cwd(), 'src/pages/SettingsPage.tsx');
    const source = fs.readFileSync(settingsPagePath, 'utf8');

    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('aria-labelledby="delete-milestone-title"');
    expect(source).toContain('aria-describedby="delete-milestone-description"');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain('onClick={cancelDeleteMilestone}');
  });

  it('keeps card delete button tappable on touch devices', () => {
    const settingsPagePath = path.resolve(process.cwd(), 'src/pages/SettingsPage.tsx');
    const source = fs.readFileSync(settingsPagePath, 'utf8');

    expect(source).not.toContain('pointer-events-none');
    expect(source).toContain('opacity-70');
  });
});

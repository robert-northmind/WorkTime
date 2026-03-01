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

    expect(source).toContain('const [pendingDeleteMilestone, setPendingDeleteMilestone]');
    expect(source).toContain('requestDeleteMilestone(milestone);');
    expect(source).toContain('Delete milestone?');
    expect(source).toContain('confirmDeleteMilestone');
  });

  it('keeps card delete button tappable on touch devices', () => {
    const settingsPagePath = path.resolve(process.cwd(), 'src/pages/SettingsPage.tsx');
    const source = fs.readFileSync(settingsPagePath, 'utf8');

    expect(source).not.toContain('pointer-events-none');
    expect(source).toContain('opacity-70');
  });
});

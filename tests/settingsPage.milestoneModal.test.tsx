import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { MilestoneChips } from '../src/components/MilestoneChips';
import type { Milestone } from '../src/types/firestore';

describe('MilestoneChips', () => {
  const milestones: Milestone[] = [
    {
      id: 'm-1',
      name: 'FY Milestone',
      type: 'period',
      date: '2026-12-31',
    },
  ];

  it('renders inline delete icon with mobile-hidden class', () => {
    render(
      createElement(MilestoneChips, {
        milestones,
        onEdit: jest.fn(),
        onDelete: jest.fn(),
      })
    );

    const deleteButton = screen.getByTitle('Delete milestone');
    expect(deleteButton.className).toContain('hidden');
    expect(deleteButton.className).toContain('sm:inline-flex');
  });

  it('asks for confirmation and does not delete when canceled', async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      createElement(MilestoneChips, {
        milestones,
        onEdit: jest.fn(),
        onDelete,
      })
    );

    await user.click(screen.getByTitle('Delete milestone'));

    expect(confirmSpy).toHaveBeenCalledWith('Delete milestone "FY Milestone"?');
    expect(onDelete).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('asks for confirmation and deletes when accepted', async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      createElement(MilestoneChips, {
        milestones,
        onEdit: jest.fn(),
        onDelete,
      })
    );

    await user.click(screen.getByTitle('Delete milestone'));

    expect(confirmSpy).toHaveBeenCalledWith('Delete milestone "FY Milestone"?');
    expect(onDelete).toHaveBeenCalledWith('m-1');

    confirmSpy.mockRestore();
  });
});

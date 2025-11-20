# Walkthrough - Settings and Balance Logic Update

I have updated the application to support per-year vacation allowances and changed the balance calculation logic as requested.

## Changes

### Settings Page
- **Removed**: "Tracking Start Date" setting.
- **Added**: "Yearly Overrides" for Vacation Allowance.
    - You can now set a specific vacation allowance (e.g., 30 days) for a specific year (e.g., 2024).
    - Default allowance is used if no override exists for the year.

### Stats Page & Logic
- **Balance Calculation**:
    - Removed the dependency on "Tracking Start Date".
    - **New Logic**: Days with **no time entries** are now treated as having **0 balance change**.
    - This means if you didn't log anything for a day (e.g., in 2023), it won't negatively affect your balance.
    - Only days with actual entries (Work, Vacation, Sick, etc.) contribute to the balance calculation.
- **Vacation Stats**:
    - Now uses the specific allowance for the calculated vacation year (based on the "Yearly Overrides" setting).

## Verification

### Manual Verification Steps
1.  **Settings**:
    - Go to Settings.
    - Verify "Tracking Start Date" is gone.
    - Add a vacation override for 2024 (e.g., 30 days).
    - Save Settings.
    - Reload page to ensure it persists.
2.  **Stats**:
    - Go to Stats.
    - Select 2024.
    - Verify "Vacation Allowance" shows 30 (if 2024 is the current vacation year).
    - Check "Yearly Balance". It should not show a huge negative number from past empty dates.
    - If you have empty days in the current year, verify they don't reduce the balance (unless you explicitly logged them).

## Files Modified
- `src/pages/SettingsPage.tsx`: UI updates.
- `src/pages/StatsPage.tsx`: Logic updates.
- `src/services/vacation/VacationService.ts`: Added yearly allowance support.

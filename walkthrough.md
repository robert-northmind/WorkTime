# Walkthrough - Timesheet Week Display Fix

I have successfully fixed the timesheet to display the correct weekdays for each week.

## The Problem
Week 47 was showing Nov 16-20 instead of Nov 17-21. The issues were:
1. ISO week-to-Monday conversion was using local time instead of UTC
2. When generating weekdays, mixing UTC and local time caused off-by-one errors

## The Solution
### ISO Week Calculation
- Used UTC methods throughout (`Date.UTC`, `getUTCDate`, `setUTCDate`)
- Correctly calculates Monday from ISO week number

### Weekday Generation
- Creates each day using `new Date(Date.UTC(...))` to ensure consistent UTC handling
- Shows only Mon-Fri (5 weekdays)
- Displays in descending order (most recent first)
- Shows "Not entered" for missing days

## Result
Week 47 now correctly displays:
- 2025-11-21 (Fri)
- 2025-11-20 (Thu)
- 2025-11-19 (Wed)
- 2025-11-18 (Tue) - Not entered
- 2025-11-17 (Mon) - Not entered

Nov 16 (Sunday) is correctly excluded.

## Files Modified
- `src/pages/TimesheetPage.tsx`: Fixed `fillWeekDays` function with proper UTC handling

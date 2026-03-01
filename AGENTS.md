# WorkTime Agent Notes

## Agent test login mode

To run the app in local dev with a hard-coded test user while still keeping real Firebase auth available:

1. Add these environment variables to `.env.local`:

```env
VITE_AGENT_TEST_AUTH_ENABLED=true
VITE_AGENT_TEST_EMAIL=agent-test@example.com
VITE_AGENT_TEST_PASSWORD=agent-test-password
```

2. Start dev server as usual:

```bash
npm run dev
```

3. On the login page, use the configured credentials (or click "Fill test credentials").

When `VITE_AGENT_TEST_AUTH_ENABLED` is not set to `true`, the app uses normal Firebase auth behavior.

## UI verification expectations

When making UI changes, always verify both:

- Desktop layout
- Mobile layout

This should be part of every agent-driven change validation.

Be explicit in validation notes:

- List every screen/route checked.
- If the change affects a shared layout/component, verify all impacted screens on desktop and mobile.
- For general UI-impacting changes, validate at least: `/login`, `/timesheet`, `/stats`, `/settings` on both desktop and mobile.
- If any screen is not verified, clearly state it as a gap.

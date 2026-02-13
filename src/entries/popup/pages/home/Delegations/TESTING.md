# Testing Proactive Delegation Revoke

The proactive revoke feature calls `shouldRevokeDelegation` from `@rainbow-me/delegation` on address change.
When the SDK returns `shouldRevoke: true`, a red "Security Alert" NudgeBanner appears on the Home screen.
Tapping "Revoke" navigates to `RevokeDelegationPage` with the security alert variant.

## Prerequisites

- Dev build (`yarn dev`)
- Non-hardware, non-read-only wallet active (HW/RO wallets return `shouldRevoke: false`)
- `delegation_enabled` feature flag on

## Option A: Mock via background service worker console

1. Open `chrome://extensions`, find Rainbow, click "Inspect views: service worker"
2. In the console, run:

```js
globalThis.__MOCK_SHOULD_REVOKE__ = true;
```

3. Switch wallets (or close/reopen the popup) to trigger a refetch
4. The red "Security Alert" banner should appear at the bottom of the Home screen
5. To disable: `globalThis.__MOCK_SHOULD_REVOKE__ = false;`

This mock is only available in dev builds (`process.env.IS_DEV`).

## Option B: Override React Query cache from popup console

1. Right-click the extension popup → Inspect
2. In the console, run (replace `0xYOUR_ADDRESS` with your active wallet address):

```js
// Access the React Query devtools if available, or use:
document.querySelector('#root').__REACT_QUERY_CLIENT__?.setQueryData(
  ['shouldRevokeDelegation', { address: '0xYOUR_ADDRESS' }],
  { shouldRevoke: true, revokes: [{ address: '0xDEADBEEF', chainId: 1 }] }
);
```

Note: this approach depends on queryClient being accessible; Option A is more reliable.

## What to verify

1. **Banner appears**: red "Security Alert" NudgeBanner floats in at the bottom of Home
2. **Dismiss works**: clicking X hides the banner; switching wallets back re-shows it
3. **Revoke navigates**: clicking the shield button navigates to `RevokeDelegationPage`
4. **Security variant**: the revoke page shows "Security Alert" title and red warning icon instead of the default lock icon
5. **Back navigation**: after revoking (or canceling), navigates back to Home (not Settings > Delegations)
6. **Address change re-check**: switching to a different wallet resets the dismissed state and re-queries

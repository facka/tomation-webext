# Messaging System Integration Guide

## Overview

This document explains the messaging system integration strategy that allows gradual transition from `webext-bridge` to the new strongly-typed messaging system.

## Feature Switch

The integration is controlled by the environment variable: **`VITE_USE_NEW_MESSAGING`**

- **Default**: `false` (uses webext-bridge)
- **To enable new system**: `true`

### Environment Setup

Create a `.env` file in the project root:

```bash
# Copy .env.example as a starting point
cp .env.example .env

# Edit .env and set:
VITE_USE_NEW_MESSAGING=false  # Start with false, test gradually
```

## Architecture

### Adapter Pattern

The integration uses an **adapter pattern** to provide a unified interface over both messaging systems:

```
┌─────────────────────────────────────────┐
│   Application Code (entrypoints)        │
│   - background/index.ts                 │
│   - content.ts                          │
│   - popup/Popup.vue, etc.               │
└────────────────┬────────────────────────┘
                 │ Uses
                 ↓
┌─────────────────────────────────────────┐
│   MessagingAdapter Interface            │
│   (src/messaging/adapter.ts)            │
│   - sendMessage()                       │
│   - onMessage()                         │
│   - getCurrentSystem()                  │
└────────────────┬────────────────────────┘
         ┌───────┴───────┐
         ↓               ↓
    ┌─────────────┐ ┌──────────────────┐
    │ webext-     │ │ new-messenger    │
    │ bridge      │ │ (createMessenger)│
    │ (current)   │ │ (new)            │
    └─────────────┘ └──────────────────┘
         ↓               ↓
    ┌──────────────────────────────────┐
    │  Browser Runtime / Ports APIs    │
    │  - runtime.sendMessage()         │
    │  - runtime.onMessage.addListener │
    │  - runtime.connect()             │
    │  - runtime.onConnect.addListener │
    └──────────────────────────────────┘
```

### File Organization

```
src/messaging/
├── index.ts           # Main exports for the module
├── messages.ts        # Core typed messaging implementation
├── contracts.ts       # Message type definitions
└── adapter.ts         # Adapter layer (webext-bridge ↔ new messenger)
```

## Migration Strategy

### Phase 1: Testing with Adapter (Current)

All entrypoints have been updated to use the **adapter**:

- ✅ `src/entrypoints/background/index.ts` - uses `createBackgroundAdapter()`
- ✅ `src/entrypoints/content.ts` - uses `createContentAdapter()`
- ✅ `src/composables/automation-store.ts` - uses `createUIAdapter()`
- ✅ `src/runtime/tomation-session/tomation-session.service.ts` - uses adapter

With `VITE_USE_NEW_MESSAGING=false` (default), everything routes through webext-bridge **transparently**.

### Phase 2: Enable New System (Next)

1. Set `VITE_USE_NEW_MESSAGING=true` in `.env`
2. Run development server: `npm run dev`
3. Test all major flows:
   - Background ↔ Content script communication
   - Popup ↔ Background communication
   - Sidepanel ↔ Background communication
   - Session creation and test execution
4. Check browser console for messaging system logs:

```
[messaging-adapter] New messaging system is ENABLED (via VITE_USE_NEW_MESSAGING)
[messaging-adapter] Using webext-bridge (VITE_USE_NEW_MESSAGING not set)
```

### Phase 3: Gradual Component Migration (Optional)

Once the new system is stable, gradually migrate UI components:

```typescript
// Before (webext-bridge)
import { sendMessage, onMessage } from 'webext-bridge/popup'

// After (adapter)
import { createUIAdapter } from '@/messaging'
const messaging = createUIAdapter()
messaging.sendMessage(...)
messaging.onMessage(...)
```

### Phase 4: Remove webext-bridge (Final)

Once all tests pass and the new system is stable:

1. Remove `webext-bridge` from `package.json`
2. Delete the webext-bridge adapter implementations from `adapter.ts`
3. Update imports to use the new messenger directly (optional)

## Usage Examples

### Background Entrypoint

```typescript
import { createBackgroundAdapter, logMessagingSystem } from '@/messaging'

const messaging = createBackgroundAdapter()

export default defineBackground(() => {
  logMessagingSystem('background')  // Logs which system is active
  
  // Register handler for incoming messages
  messaging.onMessage('content-to-background', async ({ data, sender }) => {
    const { cmd, params } = data
    // Handle command
    return { ok: true, result: ... }
  })
  
  // Send message to other context
  await messaging.sendMessage('background-to-popup', 
    { cmd: 'update', params: {...} }, 
    'popup'
  )
})
```

### Content Script

```typescript
import { createContentAdapter } from '@/messaging'

const messaging = createContentAdapter()

// Send message to background
const response = await messaging.sendMessage(
  'content-to-background',
  { cmd: 'get-workspace', params: { url: window.location.href } },
  'background'
)

// Register handler for incoming messages
messaging.onMessage('background-to-contentScript', ({ data }) => {
  const { cmd, params } = data
  // Handle update
})
```

### UI Contexts (Popup, Sidepanel, Options)

```typescript
import { createUIAdapter } from '@/messaging'

const messaging = createUIAdapter()

// Send message to background
const workspace = await messaging.sendMessage(
  'popup-to-background',
  { cmd: 'get-workspace-info', params: { ... } },
  'background'
)

// Register handler for incoming messages
messaging.onMessage('background-to-popup', ({ data }) => {
  // Update UI based on background updates
})
```

## Testing Checklist

When testing the new messaging system (`VITE_USE_NEW_MESSAGING=true`), verify:

- [ ] Extension loads without errors in background service worker
- [ ] Popup opens and populates content
- [ ] Sidepanel opens and shows workspace/session info
- [ ] Content script injects and communicates with page
- [ ] Session creation works (content → background → popup)
- [ ] Test execution flow works (all message directions)
- [ ] Tab updates propagate to popup
- [ ] Session cleanup on tab close
- [ ] Browser console shows no unusual warnings/errors
- [ ] Feature works in Chrome, Firefox, Edge (as applicable)

## Debugging

### Check which system is active

```typescript
import { isNewMessagingEnabled, logMessagingSystem } from '@/messaging'

if (isNewMessagingEnabled()) {
  console.log('Using new messenger')
} else {
  console.log('Using webext-bridge')
}

logMessagingSystem('my-context')  // Logs [messaging-adapter] Using ...
```

### Console Logs

The adapter and messaging system log important events:

```
[messaging-adapter] New messaging system is ENABLED (via VITE_USE_NEW_MESSAGING)
[messaging] One-shot handler registered for event: content-to-background
[messaging] Port connected: background → popup
[messaging] Port disconnected: popup ← background
```

### Performance Monitoring

Event throughput counters are logged in the background service worker (built-in to `registerMessageHandlers`):

```
[tomation-webext][background] Per-second throughput: sent=5, received=12
```

## Common Issues

### "No handler registered for event"

**Cause**: Message handler not registered before sending.

**Fix**: Ensure handlers are registered at module top-level, not inside functions.

```typescript
// ❌ Wrong - handler registered after it's needed
function setupHandlers() {
  messaging.onMessage('content-to-background', ...)
}
setupHandlers()  // Too late!

// ✅ Correct - handler registered at module level
messaging.onMessage('content-to-background', ...)
```

### Feature flag not taking effect

**Cause**: Environment variable not set correctly.

**Fix**:
1. Create `.env` file in project root
2. Set `VITE_USE_NEW_MESSAGING=true` (case-sensitive)
3. Restart dev server: `npm run dev`
4. Check console for confirmation log

### "Channel X is disconnected"

**Cause**: Port was closed before message was sent.

**Fix**: Check that the target context is still running when sending.

## References

- [messages.ts](./messages.ts) - Core messaging library implementation
- [contracts.ts](./contracts.ts) - Message type definitions
- [adapter.ts](./adapter.ts) - Adapter layer
- [.env.example](../.env.example) - Environment variables

# Commit Message

```
feat(sdk): add high-level API for Soroban contract event subscriptions

Implement event subscription and parsing functionality to allow developers
to subscribe to and receive events emitted by specific Soroban smart contracts.

- Add EventSubscriptionConfig, SorobanEvent, EventHandler, EventSubscription
  types to packages/sdk/src/types/index.ts
- Create SorobanEventSubscription class with:
  * Polling-based event fetching from Soroban RPC
  * Support for multiple contract subscriptions
  * Topic-based filtering of events
  * Event and error handler registration with on/off methods
  * Duplicate detection to prevent event re-processing
  * Configurable polling intervals
- Export subscribeToEvents() factory function for easy subscription creation
- Export parseEvent() helper for converting raw RPC events to structured format
- Fully documented with JSDoc examples and usage patterns
- Pass TypeScript strict mode and ESLint validation
```

closes: #167

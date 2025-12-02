# local-web-storage

A lightweight, framework-agnostic state store designed for micro frontend architectures. Uses IndexedDB for persistence and native browser APIs for pub/sub communication.

## Features

- **Zero dependencies** - Uses only native browser APIs
- **Framework agnostic** - Works with React, Vue, Svelte, vanilla JS, or any framework
- **Micro frontend friendly** - Independent sites can subscribe without sharing code
- **Persistent** - Data survives browser restarts via IndexedDB
- **Cross-tab sync** - Changes propagate to all tabs automatically
- **Type-safe** - Full TypeScript support with generics
- **Tiny** - ~2KB minified

## Architecture

```mermaid
flowchart TB
    subgraph Browser["Browser Window"]
        subgraph Tab1["Tab 1"]
            subgraph MF1["Micro Frontend A"]
                A1[Component] --> Store1[Store Instance]
            end
            subgraph MF2["Micro Frontend B"]
                B1[Component] --> Sub1[subscribeToKey]
            end
            Store1 <-->|CustomEvent| Sub1
        end

        subgraph Tab2["Tab 2"]
            subgraph MF3["Micro Frontend A"]
                A2[Component] --> Store2[Store Instance]
            end
            subgraph MF4["Micro Frontend C"]
                C1[Component] --> Sub2[subscribeToKey]
            end
            Store2 <-->|CustomEvent| Sub2
        end
    end

    Store1 <-->|BroadcastChannel| Store2
    Store1 --> IDB[(IndexedDB)]
    Store2 --> IDB

    style IDB fill:#e1f5fe
    style Store1 fill:#fff3e0
    style Store2 fill:#fff3e0
```

### Data Flow

```mermaid
sequenceDiagram
    participant C as Component
    participant S as Store
    participant Cache as In-Memory Cache
    participant IDB as IndexedDB
    participant BC as BroadcastChannel
    participant OT as Other Tabs
    participant CE as CustomEvent
    participant MF as Other Micro Frontends

    C->>S: set('user', data)
    S->>Cache: Update cache
    S->>IDB: Persist to IndexedDB
    S->>BC: Broadcast change
    BC->>OT: Notify other tabs
    S->>CE: Dispatch CustomEvent
    CE->>MF: Notify micro frontends
```

### Layer Responsibilities

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Persistence** | IndexedDB | Durable storage that survives browser restarts |
| **Cross-Tab Sync** | BroadcastChannel | Real-time sync between browser tabs |
| **In-Page Pub/Sub** | CustomEvent | Communication between micro frontends on same page |
| **Caching** | In-Memory Map | Fast synchronous reads after initial load |

## Installation

```bash
npm install local-web-storage
```

## Quick Start

### Basic Usage

```typescript
import { createStore } from 'local-web-storage';

// Define your state shape
interface AppState {
  user: { id: string; name: string } | null;
  theme: 'light' | 'dark';
  cart: string[];
}

// Create the store
const store = createStore<AppState>({
  dbName: 'my-app',
});

// Set values
await store.set('user', { id: '1', name: 'Alice' });
await store.set('theme', 'dark');

// Get values
const user = await store.get('user');
const theme = await store.get('theme');

// Subscribe to changes
const unsubscribe = store.subscribe('user', (newValue, oldValue) => {
  console.log('User changed:', oldValue, '->', newValue);
});

// Later: unsubscribe
unsubscribe();
```

### Micro Frontend Integration

The key benefit for micro frontends is that independent applications can subscribe to state changes without importing the store directly.

**Main App (owns the store):**

```typescript
import { createStore } from 'local-web-storage';

export const store = createStore<AppState>({
  dbName: 'shared-state',
  channelName: 'my-app-channel',
});
```

**Micro Frontend (subscribes without store reference):**

```typescript
import { subscribeToKey } from 'local-web-storage';

// Subscribe using only the channel name - no store import needed
const unsubscribe = subscribeToKey<User>(
  'my-app-channel',  // Same channel name
  'user',            // Key to watch
  (user, oldUser) => {
    console.log('User updated:', user);
    renderUserWidget(user);
  }
);
```

### React Integration

```typescript
import { createStore, createStoreHooks } from 'local-web-storage';

// Create store
const store = createStore<AppState>({ dbName: 'my-app' });

// Create typed hooks
const { useValue, useValueSync, useAll } = createStoreHooks(store);

// Use in components
function UserProfile() {
  const [user, setUser, loading] = useValue('user');

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={() => setUser({ ...user, name: 'Bob' })}>
        Change Name
      </button>
    </div>
  );
}
```

### Vanilla JavaScript

```typescript
import { createStore } from 'local-web-storage';

const store = createStore({ dbName: 'my-app' });

// Subscribe and update DOM
store.subscribe('count', (count) => {
  document.getElementById('counter').textContent = count;
});

// Button handler
document.getElementById('increment').onclick = async () => {
  const current = await store.get('count') ?? 0;
  await store.set('count', current + 1);
};
```

## API Reference

### `createStore<T>(options?)`

Creates a new store instance.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dbName` | `string` | `'local-web-storage'` | IndexedDB database name |
| `storeName` | `string` | `'store'` | Object store name within the database |
| `channelName` | `string` | `dbName` | BroadcastChannel name for cross-tab sync |

**Returns:** `Store<T>`

### Store Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `(key: K) => Promise<T[K] \| undefined>` | Get a value by key |
| `set` | `(key: K, value: T[K]) => Promise<void>` | Set a value |
| `delete` | `(key: K) => Promise<void>` | Delete a key |
| `subscribe` | `(key: K, listener) => Unsubscribe` | Subscribe to changes |
| `getAll` | `() => Promise<Partial<T>>` | Get all stored values |
| `clear` | `() => Promise<void>` | Clear all data |
| `destroy` | `() => void` | Close connections and cleanup |

### `subscribeToKey<T>(channelName, key, listener)`

Subscribe to a key without a store reference. Useful for micro frontends.

```typescript
const unsubscribe = subscribeToKey<User>(
  'my-app-channel',
  'user',
  (value, oldValue) => { /* handle change */ }
);
```

## Browser Support

Requires browsers with support for:

- IndexedDB
- BroadcastChannel
- CustomEvent

This includes all modern browsers (Chrome, Firefox, Safari, Edge). No IE11 support.

## How It Works

1. **Write Path**: When you call `set()`, the store:
   - Updates the in-memory cache (instant)
   - Persists to IndexedDB (async)
   - Dispatches a CustomEvent (in-page micro frontends)
   - Posts to BroadcastChannel (other tabs)

2. **Read Path**: When you call `get()`, the store:
   - Returns from cache if available (sync-fast)
   - Falls back to IndexedDB if not cached

3. **Cross-Tab**: BroadcastChannel ensures all tabs see the same state. Each tab maintains its own cache, synchronized via broadcast messages.

4. **Micro Frontends**: CustomEvents on `window` allow independent applications to subscribe without sharing module scope. They only need to know the channel name.

## License

MIT

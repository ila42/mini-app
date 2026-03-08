# Storage Architecture

## Where data lives

In Telegram context the app uses **Telegram Cloud Storage** (via `@tma.js/sdk`).
In a regular browser / dev server it falls back to **localStorage** automatically.

## Cloud Storage keys

| Key | Value | Description |
|---|---|---|
| `categories` | `Category[]` as JSON string | List of expense categories |
| `expenses` | `Expense[]` as JSON string | All recorded expenses |
| `shopping` | `ShoppingItem[]` as JSON string | Shopping list items |
| `cats_seeded` | `"1"` | Set after default categories are seeded on first run |

## Data structures

```ts
// categories
{ id: string; name: string; color: string; emoji: string }[]

// expenses
{ id: string; date: string; amount: number; description: string; categoryId: string }[]

// shopping
{ id: string; name: string; amount?: number; categoryId: string; purchased: boolean; addedAt: string }[]
```

## SDK used

`@tma.js/sdk` v2 — `initCloudStorage()` returns a lazy singleton `CloudStorage` instance.
Key methods: `.get(key)`, `.set(key, value)`, `.delete(key)`, `.getKeys()`.

The singleton is created on first use and shared across all hooks via the module-level `_cs` variable in `src/hooks/useCloudStorage.ts`.

## Migration from localStorage

On the first load of each data key the hook checks:
- If Cloud Storage has no value for that key **and** localStorage does → copy to Cloud Storage, remove from localStorage.

This migration is transparent and happens automatically. No user action needed.

## Multi-device behaviour

Telegram Cloud Storage is **per-user, cross-device**. A user who logs in on a second device will see the same categories, expenses, and shopping list that they created on the first device.

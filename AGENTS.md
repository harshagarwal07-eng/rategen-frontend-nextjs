# Agent & AI Coding Guidelines — Frontend

This document records patterns, decisions, and anti-patterns for AI coding agents (Claude Code, Copilot, etc.) working on this frontend codebase. Keep it up to date when a new invariant is established.

---

## cmdk Command — searchable dropdowns

cmdk's default fuzzy filter (`commandScore`) ranks `CommandItem` children unreliably when items contain multi-element children (icons, badges, multi-line labels, trailing buttons). It can score short queries so low that valid matches become unreachable (e.g. typing `"ind"` fails to surface `"India"`).

**Always use `shouldFilter={false}` for any searchable `<Command>`**, then implement manual case-insensitive substring filtering:

```tsx
const [search, setSearch] = useState("");

const filtered = useMemo(() => {
  const q = search.trim().toLowerCase();
  if (!q) return items;
  return items.filter(i => i.label.toLowerCase().includes(q));
}, [items, search]);

<Command shouldFilter={false}>
  <CommandInput value={search} onValueChange={setSearch} placeholder="Search…" />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup>
      {filtered.map(i => (
        <CommandItem key={i.id} value={i.id} onSelect={() => pick(i)}>
          <SomeIcon />
          <span>{i.label}</span>
        </CommandItem>
      ))}
    </CommandGroup>
  </CommandList>
</Command>
```

Key points:
- `value` on `CommandItem` must be a **stable unique ID**, not a display label — cmdk uses it for keyboard navigation, not filtering (since filtering is disabled).
- Filter against the **human-readable label** (or other searchable text), not the ID.
- Reset `search` state when the popover/dialog closes so the user starts fresh next time.
- `CommandEmpty` still renders correctly when `filtered` is empty (cmdk counts rendered `CommandItem` nodes).

If you genuinely want cmdk's fuzzy filter (e.g. a pure command-palette with single plain-text items), set `shouldFilter={true}` explicitly with a comment explaining why:

```tsx
{/* shouldFilter={true}: items are plain text labels with no icon children, fuzzy OK */}
<Command shouldFilter={true}>
```

The lint rule **`local/cmdk-explicit-filter`** enforces this: any `<Command>` that contains a `<CommandInput>` without a `shouldFilter` prop is an error.

### Reference implementation
`src/components/forms/dmc-hotel-sections/market-create-modal.tsx` — `CountryMultiSelect`

### Fixed instances (as of 2026-04-25)
| File | Pattern fixed |
|---|---|
| `src/components/forms/dmc-hotel-sections/market-create-modal.tsx` | Country picker (multi-element checkbox + label) |
| `src/components/crm/queries/ops/bookings/add-booking-dropdown.tsx` | Activity picker (badges + label + date) |
| `src/components/ui/phone-input.tsx` | Country dial-code picker (flag + label + code) |

---

## ESLint custom rules

Custom rules live in `eslint-rules/` at the frontend root and are loaded as a local plugin in `eslint.config.mjs`.

| Rule | Severity | What it catches |
|---|---|---|
| `local/cmdk-explicit-filter` | error | `<Command>` with `<CommandInput>` but no `shouldFilter` prop |

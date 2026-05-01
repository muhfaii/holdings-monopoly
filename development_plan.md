# Holdings: KL Edition — Development Plan

**Version:** 0.1
**Last updated:** 2026-05-01
**Status:** Approved for Phase 1 kickoff
**Companion document:** [holdings_prd.md](holdings_prd.md)

---

## 1. Purpose

This document translates the PRD into an executable engineering plan: stack decisions, system architecture, phased build order, testing strategy, and the open questions resolved during planning.

It is the single source of truth for **how** we build Holdings: KL Edition v1. The PRD is the source of truth for **what** we build.

---

## 2. Decisions resolved (from PRD §14 + planning discussion)

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Tech stack | **React + TypeScript + Vite + Tailwind** | Fast dev cycle; no SSR needed for a client-only game; PRD mandates local-first |
| 2 | State management | **Zustand** | Lightweight, ergonomic for nested state, easy serialization for save/resume |
| 3 | Persistence | **localStorage** for v1 | Game state JSON fits well under 5 MB; simpler than IndexedDB |
| 4 | Visual design | **Skeuomorphic-lite** — board game feel with clean typography | Evokes the tactile board game experience without heavy art assets |
| 5 | Negotiation UI | **Modal-based (blocking)** | Hot-seat means one player acts at a time; modals enforce clear turn flow |
| 6 | Move history | **Full event log (structured), rendered as summarized turn log** | Enables save/resume and dispute resolution; readable UI on top |
| 7 | Rule enforcement | **Strict with explanations** | System blocks invalid moves and explains why — prevents arguments |
| 8 | Decision flow | **Explicit `pendingDecision` state machine in the engine** | Makes invalid actions impossible; mid-negotiation save/resume is trivial |
| 9 | Undo support (v1) | **No** | Strict enforcement blocks most misclicks; reduces engine complexity |
| 10 | Trade validation | **Pure free-market** — any negotiated value allowed | Aligns with "negotiation is the game" design philosophy (Appendix A) |
| 11 | RNG | **Seeded PRNG; seed lives in `GameState`; engine advances it inside the reducer** | Deterministic save/resume and reproducible tests |
| 12 | Reducer transactionality | **All-or-nothing** — return new state or original state with errors, never half-applied | Costs nothing now; saves us when v2 adds multiplayer |
| 13 | Card deck implementation | **Pre-shuffled draw pile in state, deterministic with seed** | Simple, replayable |
| 14 | Platform / mode (v1) | **Web SPA, local hot-seat, synchronous** | PRD §4.1 recommendation; lowest scope; fastest validation |
| 15 | Game engine framework | **None — pure TypeScript** (no Unity, Phaser, etc.) | Game is turn-based, UI-heavy, text/card-driven; no physics or rendering needs |

---

## 3. System architecture

### 3.1 Layered architecture

```
┌─────────────────────────────────────────────────────┐
│  UI Layer (React components)                        │
│  - Renders state, captures user intent              │
│  - Knows nothing about rules                        │
└────────────────────┬────────────────────────────────┘
                     │ dispatches Actions / reads State
┌────────────────────▼────────────────────────────────┐
│  Store Layer (Zustand)                              │
│  - Holds current GameState                          │
│  - Forwards Actions → Engine, applies returned      │
│    state, persists to localStorage                  │
└────────────────────┬────────────────────────────────┘
                     │ pure function calls
┌────────────────────▼────────────────────────────────┐
│  Engine Layer (pure TypeScript)                     │
│  - reducer(state, action) → { state, events }       │
│  - All rules live here. No React. No I/O.           │
│  - Fully unit-testable in isolation.                │
└─────────────────────────────────────────────────────┘
```

The engine is the soul of the project. Keeping it pure means we can run thousands of game scenarios in milliseconds, swap UIs later (mobile, online multiplayer in v2), and reason about correctness without React in the way.

### 3.2 The engine: reducer + event stream

The engine is one big function:

```ts
type Reducer = (state: GameState, action: Action) => Result;
type Result = { state: GameState; events: GameEvent[]; errors?: RuleError[] };
```

- **Action** = user intent: `{ type: 'BUY_PROPERTY', playerId, propertyId, withCoOwner?, equity? }`
- **Event** = "what happened": `{ type: 'RENT_PAID', from, to, amount, propertyId }` — feeds the move history log and UI animations
- **Errors** = rule violations: invalid actions return errors instead of mutating state — UI shows them as toast/modal explanations

The event stream gives us the move history (PRD §11.2), save/resume (PRD §11.4), and a clean audit trail for dispute resolution — all from one mechanism.

### 3.3 State shape

```ts
interface GameState {
  version: 1;                          // for save migrations
  rngSeed: string;                     // deterministic dice/cards
  phase: 'setup' | 'active' | 'ended';
  turn: {
    currentPlayerId: PlayerId;
    rollsThisTurn: number;             // doubles tracking
    pendingDecision: Decision | null;  // see §3.4
    lap: Record<PlayerId, number>;     // for JV duration
  };
  players: Record<PlayerId, PlayerState>;
  properties: Record<PropertyId, PropertyState>;
  jointVentures: JV[];
  ropTokens: RoPToken[];
  kopitiamPot: number;
  decks: { chance: CardDeck; communityChest: CardDeck };
  history: GameEvent[];                // append-only log
}
```

State is **normalized** (everything keyed by ID, no nested duplicates). Equity, JV, and token relationships are one-way references — avoids sync bugs.

### 3.4 The hardest architectural problem: multi-step decisions

Most actions in this game are not atomic. Co-purchase = "invite partner → negotiate equity → both confirm → pay." Building dispute = "propose → minority refuses → choose dilution OR force buyout → confirm." JV formation, ROFR, token issuance, auctions, bankruptcy liquidation — all multi-step.

**Solution: explicit `pendingDecision` state machine.**

```ts
type Decision =
  | { type: 'AWAIT_BUY_DECISION'; playerId; propertyId }
  | { type: 'AWAIT_COPURCHASE_TERMS'; inviter; invitee; propertyId }
  | { type: 'AWAIT_BUILD_CONSENT'; propertyId; pendingFromPlayers: PlayerId[] }
  | { type: 'AWAIT_DILUTION_OR_BUYOUT'; propertyId; minorityPlayer }
  | { type: 'AWAIT_ROFR'; propertyId; offer; offeree }
  | { type: 'AWAIT_AUCTION_BID'; propertyId; eligiblePlayers; currentBid }
  | { type: 'AWAIT_BANKRUPTCY_LIQUIDATION'; playerId; debt };
```

The engine sits in a `pendingDecision` slot; the next valid `Action` must resolve that decision. This:

- Makes invalid actions impossible (UI only shows buttons matching the current decision)
- Makes save/resume mid-negotiation trivial — just persist the decision
- Gives us a single chokepoint to test every multi-step flow

This is the single most important architectural choice. Get it right and Phase 3+ is straightforward.

### 3.5 Module layout

```
src/
├── engine/                       # pure TypeScript — zero UI dependency
│   ├── core/
│   │   ├── state.ts              # GameState, PlayerState, PropertyState types
│   │   ├── reducer.ts            # main dispatcher: routes Actions to handlers
│   │   ├── decisions.ts          # Decision state machine helpers
│   │   └── events.ts             # GameEvent types, log append helpers
│   │
│   ├── rules/                    # one file per rule cluster
│   │   ├── movement.ts           # dice, doubles, GO, jail
│   │   ├── purchase.ts           # buy / decline / auction
│   │   ├── coownership.ts        # equity, rounding, dilution, force buyout
│   │   ├── rent.ts               # rent calc (with JV + RoP modifiers)
│   │   ├── building.ts           # houses/hotels, even-build constraint
│   │   ├── mortgage.ts           # mortgage/unmortgage, consent rules
│   │   ├── jv.ts                 # JV lifecycle, effects, breaking
│   │   ├── rop.ts                # token issuance, usage, refund
│   │   ├── rofr.ts               # right of first refusal flow
│   │   ├── kopitiam.ts           # pot in/out
│   │   ├── cards.ts              # Chance + Community Chest
│   │   └── bankruptcy.ts         # debt, asset transfer, elimination
│   │
│   ├── data/
│   │   ├── board.ts              # 40 squares (locked from PRD §5)
│   │   ├── rents.ts              # rent ladders
│   │   └── cards.ts              # card definitions
│   │
│   ├── persistence/
│   │   ├── serialize.ts          # GameState ↔ JSON
│   │   └── migrations.ts         # version migrations
│   │
│   └── rng.ts                    # seeded PRNG
│
├── store/
│   └── gameStore.ts              # Zustand store, dispatches to engine,
│                                 # auto-saves to localStorage
│
├── components/
│   ├── Board/                    # Board view, squares, player tokens
│   ├── PlayerDash/               # Cash, properties, JV, tokens
│   ├── TitleDeed/                # Property card with all fields
│   ├── Modals/                   # One per Decision type
│   │   └── DecisionModalRouter.tsx  # reads pendingDecision, renders the right modal
│   ├── GameLog/                  # Move history / event log
│   ├── HUD/                      # Dice, current player, Kopitiam pot, phase
│   └── Setup/                    # Player count, names, game start
│
├── hooks/                        # useGameActions, useTurnFlow, etc.
├── utils/                        # rounding helpers, formatting
└── data/                         # static UI copy (card text, tooltips)
```

**Rule of thumb:** if a function reads or writes more than one of (player, property, JV, token), it belongs in `rules/`, not under one of the entity files.

### 3.6 Data flow: "Land on co-owned property" (worked example)

1. UI: player clicks "Roll Dice"
2. Store dispatches `{ type: 'ROLL_DICE' }`
3. `reducer` → `rules/movement.ts` rolls (using seeded RNG), moves token
4. Movement handler detects landed-on-property, calls `rules/rent.ts`
5. `rent.ts` checks: owners? mortgaged? RoP token covering this lander? lander in JV with any owner?
6. Returns: `{ chargesPerOwner: [{ to: P2, amount: 30 }, { to: P3, amount: 20 }], refunds: [] }`
7. Reducer applies cash transfers, emits events: `MOVED`, `RENT_CALCULATED`, `RENT_PAID × n`
8. Store receives new state + events, updates Zustand
9. React re-renders board (token moved), dashboards (cash changed), event log (new entries)
10. localStorage auto-save fires

The UI knows nothing about JVs or RoP tokens during rent calculation — that is all engine concern.

### 3.7 UI architecture

- **One screen, multiple zones:** board (center), current-player HUD (top), all-players dashboards (right rail), event log (bottom or collapsible right), action bar (bottom)
- **Modals are the negotiation UI** — driven entirely by `pendingDecision`. A single `<DecisionModalRouter>` reads the decision type and renders the matching modal. No modal state lives outside the engine.
- **Component tree mirrors state shape:** `<Board>` reads `properties` + `players[*].position`; `<PlayerDash>` reads one player; `<TitleDeed>` reads one property
- **Selectors via Zustand** keep re-renders narrow — only components reading changed slices re-render

### 3.8 Persistence and save/resume

- **Auto-save:** after every applied action, serialize `GameState` to localStorage under `holdings:autosave`
- **Manual saves:** 3 slots under `holdings:slot:{1,2,3}`, with metadata (timestamp, player count, turn #)
- **Schema versioning:** every saved state carries `version: N`; migrations live in `persistence/migrations.ts`
- **Resume on load:** check autosave → offer "Resume game?" if present
- **Refresh safety:** because state is fully serializable and `pendingDecision` captures mid-flow state, browser refresh during a co-purchase negotiation drops you back exactly where you were

---

## 4. Phased build order

Eight weeks of focused work, organized into seven phases. Each phase ends with a working, playable artifact at the documented milestone — never a half-built mess.

### Phase 1 — Core engine + minimal board (Week 1–2)
**Goal:** Two players can move around the board, buy properties, pay rent, and go bankrupt.

- TypeScript types (`core/state.ts`) — full game state, player, property
- Board data: 40 squares with prices, color groups, rent ladders
- Seeded RNG and dice rolling with doubles + 3-doubles-to-jail
- Game state machine: setup → active → ended; turn phases
- Basic player actions: move, buy solo, pay rent, pay tax
- Jail mechanics: enter, pay $50, roll doubles, 3-turn max
- GO: collect $200 on pass
- Simple bankruptcy: can't pay → eliminated, assets to creditor
- Minimal board UI: 40 squares rendered, player tokens move, dice display
- Player dashboard: cash balance, owned properties list

**Milestone:** Two players play a stripped-down game to completion.

### Phase 2 — Cards + Kopitiam + auctions (Week 2–3)
**Goal:** All classic Monopoly mechanics work.

- Chance and Community Chest decks (16 cards each), shuffle, draw, discard
- Card effects wired into game flow
- Kopitiam pot: tax/fees feed in, landing on slot 20 collects
- Auction flow when player declines purchase
- Mortgage/unmortgage with 10% interest
- Building: houses (even-build), hotels, sell back at half
- Monopoly detection (own all properties in color group)
- Railroad rent scaling (1/2/3/4 owned)
- Utility rent (4× / 10× dice)
- Title deed card UI with rent ladder

**Milestone:** Full classic Monopoly game playable (no new mechanics yet).

### Phase 3 — Co-ownership (Week 3–4)
**Goal:** Two players can co-purchase, split rent, and navigate equity disputes.

- Co-purchase flow: invite partner, negotiate equity (min 25%), split cost
- Rent distribution with equity-based rounding rules (PRD §7.2)
- Co-owned building: consent flow, cost splitting
- Building refusal → negotiation modal (dilution at custom price OR force buyout at book value)
- Co-owned mortgage/unmortgage with unanimous consent
- 25% equity floor enforcement
- Monopoly definition with mixed ownership (equity in all properties of group)
- Co-purchase negotiation modal UI
- Building dispute negotiation modal UI
- Title deed cards updated with equity splits display

**Milestone:** Co-ownership stress tests pass — dilution, force buyout, rounding edge cases.

### Phase 4 — Joint Ventures (Week 4–5)
**Goal:** JV alliances work with all interactions.

- JV formation: partner selection, duration, break fee negotiation
- Free passage on JV partner's solo-owned properties
- JV + co-ownership rent refund logic (PRD §8.3)
- Auction non-compete: designate one bidder per JV
- JV duration tracking via lap counter (checked at turn start)
- JV expiry (natural end) and breaking (with fee)
- JV contract card UI
- JV formation modal

**Milestone:** JV + co-ownership edge cases pass — partner refund with non-JV co-owner.

### Phase 5 — Right of Passage tokens (Week 5–6)
**Goal:** Tokens issue, use, transfer, and refund correctly.

- Token issuance: scope (property/group/all), type (single/permanent), recorded value
- Token usage: rent waiver on covered property; single-use consumed
- Token disclosure on title deeds
- Property sale by issuer: refund logic (unused single → full, used single → none, permanent → full)
- Equity stake sale: tokens transfer to buyer with obligations
- Bankruptcy of issuer: tokens remain valid against new owners
- Token issuance modal UI
- Token card UI
- Token display on title deed cards

**Milestone:** Token lifecycle complete — issue, use, transfer on sale, refund, survive bankruptcy.

### Phase 6 — Equity trading + ROFR (Week 6–7)
**Goal:** Players can sell equity stakes with right of first refusal.

- Equity sale initiation: seller + third-party buyer negotiate cash price
- ROFR notification to other co-owner
- Match (pay exact price, acquire stake) or Waive (third party buys)
- Token transfer on equity sale
- ROFR modal UI
- Equity trade confirmation UI

**Milestone:** Full ROFR flow — match and waive paths verified.

### Phase 7 — Polish, save/resume, onboarding (Week 7–8)
**Goal:** Game ships per PRD §13 acceptance criteria.

- Save/resume: JSON serialization, auto-save per turn, 3 manual slots
- Resume restores full state including move history
- localStorage persistence with corruption detection
- Decision matrix reference card (consent rules quick-lookup)
- Game event log: scrollable, human-readable, structured underneath
- Onboarding flow: explain new mechanics to Monopoly-familiar players (target: first move within 5 minutes)
- Color-blind safe property colors
- Keyboard navigation for all flows
- Responsive layout (tablet 1024×768 minimum)
- Edge case sweep: all 9 design stress tests produce documented outcomes
- 3 external playtest sessions; feedback incorporated

**Milestone:** Full 2-player game start-to-finish, save mid-game, resume, complete. P0 bug count: 0.

---

## 5. Testing strategy

Three tiers, each catching different bug classes. None require React — the engine is pure.

| Tier | What it tests | Example |
|------|---------------|---------|
| **Unit** | Single rule function, isolated | `rules/coownership.test.ts` — equity rounding with 50/50 split, 25/75 split, 33/67 split |
| **Scenario** | Scripted multi-action flows from PRD §11.2 | `scenarios/flow-A-land-on-unowned.test.ts` — full sequence A through G |
| **Property-based** | Random inputs, verify invariants | `invariants/cash-conservation.test.ts` — total cash + bank + Kopitiam constant after any action sequence |

**Invariants worth checking property-based:**

- Cash conservation: total cash across players + bank + Kopitiam pot is constant (modulo external sinks/sources documented per action)
- Equity sums: every co-owned property's equity shares sum to exactly 100%
- No negative cash without bankruptcy: any state with `player.cash < 0` must coincide with a bankruptcy decision pending
- Token validity: no token references a property whose ownership it could not have applied to at issuance time

**Stress tests:** the 9 design stress tests from the design doc are scripted as scenario tests and gating CI.

---

## 6. Non-functional checklist (from PRD §12)

To verify each release candidate against:

- [ ] Turn transitions < 500 ms (measured)
- [ ] UI animations < 300 ms (measured)
- [ ] No data loss on browser refresh (manual test, every phase)
- [ ] Color-blind safe palette (validated with simulator)
- [ ] Keyboard navigation for all flows (manual test)
- [ ] Screen reader labels on all interactive elements
- [ ] Latest 2 versions of Chrome, Safari, Firefox, Edge — manual smoke test
- [ ] Responsive at 1024×768 (tablet baseline)
- [ ] Local-first: no network calls in production build (verified via DevTools)

---

## 7. Risks (from PRD §15) and architectural mitigations

| Risk | How this architecture mitigates |
|------|-------------------------------|
| Negotiation flows feel clunky | `pendingDecision` machine + Phase 3 prototype validates the modal pattern early; if Phase 3 modals feel wrong, JV/ROFR modals get redesigned before being built |
| Co-ownership rules too complex | Strict enforcement + decision matrix reference card; rule violations explained in-context |
| Game length runs > 3 hours | Out of scope architecturally; "speed game" variant deferred to v2 |
| Rule edge cases discovered during play | Full event log + property-based invariant tests catch most before playtest; manual override is intentionally NOT in v1 (free-market design philosophy holds) |
| Open-info bullying | Intentional; no architectural mitigation needed for v1 |

---

## 8. Out of scope for v1 (deferred to v2+)

These are explicitly NOT being architected for now, even where the architecture could accommodate them:

- Online multiplayer (engine purity makes this v2-friendly, but no networking layer in v1)
- AI opponents (engine purity makes this v2-friendly, but no AI hooks in v1)
- Undo / time travel (no invertible actions, no per-turn snapshots)
- Animations beyond basic transitions
- Sound / music
- Achievements / progression
- Custom rule variants
- Mobile-native packaging
- Custom city editor

---

## 9. Definition of done (v1 launch gate)

Per PRD §13:

1. Two players can complete a full game without rule ambiguity
2. All 7 critical user flows (PRD §11.2) work end-to-end
3. All 9 design stress tests produce documented outcomes
4. State save/resume preserves exact game state across browser sessions
5. Decision matrix reference card accessible from any screen
6. ≥ 3 external playtest sessions completed; feedback incorporated
7. No P0 bugs (game-breaking, state-corrupting)
8. Onboarding gets a Monopoly-familiar player into their first move within 5 minutes

---

## 10. Next step

Begin **Phase 1: Core engine + minimal board.** First task: scaffold the Vite + React + TypeScript + Tailwind project and define the type system in `engine/core/state.ts`.

---

*End of plan.*

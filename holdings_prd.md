# Holdings: KL Edition — Product Requirements Document

**Version:** 0.1 (Pre-prototype)
**Last updated:** May 1, 2026
**Status:** Draft — ready for engineering scoping
**Owner:** [Your name]

---

## 1. Executive summary

**Holdings: KL Edition** is a digital implementation of an investment-themed Monopoly variant set in Kuala Lumpur. It preserves 100% of classic Monopoly mechanics (board, dice, jail, houses, auctions, bankruptcy elimination) and adds three interlocking investment mechanics: **co-ownership with equity shares**, **Joint Ventures (formal 2-player alliances)**, and **Right of Passage tokens (negotiable rent waivers)**.

The game targets **board game enthusiasts** who want strategic depth and dealmaking texture beyond classic Monopoly. Game length: 2–3 hours. Player count: 2–6. Win condition: last solvent player.

---

## 2. Vision and goals

### 2.1 Product vision

> Monopoly redesigned as a capital markets simulator — where wealth comes from coalitions, not just luck — while preserving the familiar surface that makes it accessible.

### 2.2 Goals

- **Strategic depth.** Outcomes flow from negotiation and portfolio decisions, not dice luck alone.
- **Familiar surface.** Players who know Monopoly should be playing within 10 minutes; new mechanics layer cleanly on top.
- **Negotiation as the core loop.** Every co-ownership, JV, and Right of Passage decision creates a deal moment.
- **Cultural authenticity.** KL neighborhoods, real utilities (Tenaga, Petronas), and Kopitiam mechanic give the game a sense of place.

### 2.3 Non-goals (explicitly out of scope for v1)

- Stock market mini-game (rejected during design)
- Hidden information / bluffing mechanics (open information by design)
- Real-money or gambling features
- Tournament ranking or matchmaking systems
- Multi-language support beyond English in v1
- Custom city editor (v2 candidate)
- AI opponents (v2 candidate — see Section 11)

---

## 3. Target users

### 3.1 Primary persona: "The Strategic Enthusiast"

- Age 25–45, plays board games regularly with a consistent group
- Familiar with classic Monopoly; finds it shallow but loves the format
- Enjoys games like *Catan*, *Power Grid*, *Brass: Birmingham*
- Will read a 12-page rulebook willingly
- Plays in 2–3 hour sessions

### 3.2 Secondary persona: "The Returning Casual"

- Played Monopoly as a kid, hasn't touched it in years
- Lured back by the investment theme and KL setting
- Needs onboarding but won't stick around if it's overwhelming

---

## 4. Scope: v1 platform decisions

### 4.1 Platform (TBD — needs decision before vibe coding)

Open questions to resolve at kickoff:

- **Web (single-page app)** vs **mobile-native** vs **cross-platform (React Native / Flutter)**
- **Local hot-seat only** (everyone shares one device) vs **online multiplayer** vs **both**
- **Synchronous only** (real-time games) vs **async also supported** (turn notifications)

**Recommendation for vibe coding v1:** Web, local hot-seat, synchronous. Lowest scope, fastest validation. Add multiplayer in v2.

### 4.2 v1 feature scope

In-scope:
- Full board (40 squares, KL-themed)
- All classic Monopoly rules
- Co-ownership system with equity shares
- Joint Venture contracts
- Right of Passage tokens
- Kopitiam pot mechanic
- 2–6 players, hot-seat
- Game state save/resume
- Visual title deed cards with new fields

Out of scope for v1:
- Online multiplayer
- AI opponents
- Animations beyond basic transitions
- Sound effects / music
- Achievements / progression
- Custom rule variants

---

## 5. The board (locked design)

### 5.1 Property layout

| Slot | Square | Type | Price | Color group character |
|------|--------|------|-------|----------------------|
| 0 | GO | Corner | — | Collect $200 |
| 1 | Kampung Baru | Brown | $60 | Old KL Heart |
| 2 | Community Chest | Card | — | Stable/positive |
| 3 | Chow Kit | Brown | $60 | Old KL Heart |
| 4 | LHDN Tax | Tax | -$200 | Pay to Kopitiam pot |
| 5 | KL Sentral | Railroad | $200 | — |
| 6 | Wangsa Maju | Light Blue | $100 | Working Suburbs |
| 7 | Chance | Card | — | Risky/volatile |
| 8 | Pudu | Light Blue | $100 | Working Suburbs |
| 9 | Cheras | Light Blue | $120 | Working Suburbs |
| 10 | Jail / Just Visiting | Corner | — | Classic rules |
| 11 | Old Klang Road | Pink | $140 | Mid-tier Districts |
| 12 | Tenaga Nasional | Utility | $150 | — |
| 13 | Kepong | Pink | $140 | Mid-tier Districts |
| 14 | Bukit Jalil | Pink | $160 | Mid-tier Districts |
| 15 | TBS | Railroad | $200 | — |
| 16 | Brickfields | Orange | $180 | Cultural & Heritage |
| 17 | Community Chest | Card | — | Stable/positive |
| 18 | Chinatown | Orange | $180 | Cultural & Heritage |
| 19 | Bukit Bintang | Orange | $200 | Cultural & Heritage |
| 20 | Kopitiam | Corner | — | Collect the pot |
| 21 | Bangsar South | Red | $220 | Emerging Hotspots |
| 22 | Chance | Card | — | Risky/volatile |
| 23 | TRX | Red | $220 | Emerging Hotspots |
| 24 | Mid Valley | Red | $240 | Emerging Hotspots |
| 25 | Masjid Jamek | Railroad | $200 | — |
| 26 | Mont Kiara | Yellow | $260 | Mature Suburbs |
| 27 | TTDI | Yellow | $260 | Mature Suburbs |
| 28 | Petronas | Utility | $150 | — |
| 29 | UM | Yellow | $280 | Mature Suburbs |
| 30 | Go to Jail | Corner | — | Go directly to Jail |
| 31 | Bangsar | Green | $300 | Premium Residential |
| 32 | Pusat Bandar Damansara | Green | $300 | Premium Residential |
| 33 | Community Chest | Card | — | Stable/positive |
| 34 | Ampang Hilir | Green | $320 | Premium Residential |
| 35 | Awan Besar | Railroad | $200 | — |
| 36 | Chance | Card | — | Risky/volatile |
| 37 | Bukit Tunku | Dark Blue | $350 | Trophy Addresses |
| 38 | Cukai Mewah | Tax | -$100 | Pay to Kopitiam pot |
| 39 | KLCC | Dark Blue | $400 | Trophy Addresses |

### 5.2 Rent ladders (classic Monopoly preserved)

Each property has a 6-level rent ladder: base / monopoly (no buildings) / 1 house / 2 houses / 3 houses / 4 houses / hotel. Use exact classic Monopoly rent values, transposed by tier.

Railroads: $25 / $50 / $100 / $200 (1/2/3/4 owned).
Utilities: 4× dice / 10× dice (1/2 owned).

---

## 6. Core game mechanics

### 6.1 Classic Monopoly rules (preserved)

- 2 dice, standard movement, doubles roll again (3 doubles → jail)
- Pass GO collect $200
- Jail: 3 turns max; pay $50 to leave; Get Out of Jail Free cards
- Houses build evenly across color group (max 4); then hotel (replacing 4 houses)
- Player can buy on landing OR decline → property auctions to all players
- Mortgage at half purchase price; 10% interest to unmortgage
- Bankruptcy = elimination; assets transfer to largest creditor
- Win: last solvent player

### 6.2 Card decks

- **Chance (16 cards):** classic Monopoly cards leaning into volatile/risky
- **Community Chest (16 cards):** classic Monopoly cards leaning into stable/positive
- "Pay the bank" cards route to the Kopitiam pot

---

## 7. New mechanic: Co-ownership

### 7.1 Formation

When a player lands on an unowned property and chooses to buy, they may invite **one** other player to co-purchase before the transaction completes. The two players negotiate equity split (must sum to 100%, minimum 25% per holder).

Each co-owner pays their proportional share of the purchase price.

### 7.2 Rent

Rent splits proportionally to equity. When rent doesn't divide evenly:
- Round each share to nearest $1
- Majority owner gets the rounding benefit
- For 50/50 splits, the lander chooses which co-owner gets the extra dollar

### 7.3 Building

- Both co-owners must consent to build
- Costs split proportionally by equity
- If minority can't or won't pay their share:
  1. Negotiate equity dilution at any agreed price (optional)
  2. If no agreement: majority can force buyout at current book value (purchase price + buildings at cost)
- Below 25% floor: triggers force-buyout option

### 7.4 Mortgaging

- Requires **unanimous consent** of all co-owners (either can veto)
- Houses sold to bank at half price first; proceeds split per equity
- Mortgage cash (half of purchase price) split per equity
- Mortgaged properties collect no rent

### 7.5 Unmortgaging

- Cost: mortgage value + 10% interest, split per equity
- If a co-owner can't or won't pay their share: same dilemma resolution as building (negotiate dilution, then force buyout if needed)

### 7.6 Selling

- Selling the **whole property** requires unanimous consent
- Selling **your equity stake** to a third party triggers Right of First Refusal (see 7.7)

### 7.7 Right of First Refusal (ROFR)

When a co-owner negotiates an offer from a third party for their equity stake:
1. Selling co-owner formally presents the cash offer to the other co-owner
2. Other co-owner has two choices only:
   - **Match:** pay the exact offer to acquire the stake
   - **Waive:** the third party purchases at the offered price
3. No counter-offers permitted
4. Decision must be made within one turn cycle
5. Cash offers only — no IOUs, properties, or favors (avoids valuation disputes)

### 7.8 Monopoly definition with mixed configurations

A monopoly exists on a color group when at least one player has equity in **every property** in that group. Multiple players can simultaneously be monopoly holders.

Effects:
- Double rent on unimproved properties (classic monopoly bonus)
- Building unlocked

Building decisions: each property's majority owner has independent decision rights. To build evenly across the color group, all majority owners must consent.

---

## 8. New mechanic: Joint Ventures (JV)

### 8.1 Formation

- Maximum 2 players per JV
- One JV per player at a time
- Default duration: 5 laps around GO
- Default break fee: $200 per remaining lap, paid by the breaker
- Duration and break fee are negotiable at signing
- Recorded on a JV contract card listing partners, start lap, duration, and break fee

### 8.2 Active JV effects

- **Free passage** on each other's solo-owned properties (no rent)
- **Auction non-compete:** must designate one bidder before each auction starts; non-designated partner is locked out from that auction
- Auction winner takes the property as a **solo asset** (can later invite partner to co-own via standard process)
- JV duration check happens at the **start of each player's turn**, never mid-action

### 8.3 JV + Co-ownership interactions

- Equity-share rent splits on co-owned properties are NOT overridden by JV
- On JV partner's solo property: lander pays full rent, then partner refunds their equity share back to lander
- On property co-owned with a non-JV partner: lander pays full rent; JV partner refunds only their share to lander; non-JV co-owner keeps their share
- JV does not add restrictions on equity sales beyond standard ROFR

### 8.4 Breaking a JV

- Breaker pays the agreed break fee to the partner
- Co-owned properties survive the break at their existing equity splits
- Right of Passage tokens issued during the JV remain valid

---

## 9. New mechanic: Right of Passage tokens

### 9.1 Issuance

- Issued by property owner (or both co-owners by agreement)
- **Snapshot:** covers only properties owned by issuer at the moment of issuance
- Single-use OR permanent (specified at issuance)
- Scope: single property, color group, or all-current-properties of issuer
- Negotiable for cash, IOUs, reciprocal tokens, properties, or favors
- Original price MUST be recorded in dollar terms on the token (for refund accounting)

### 9.2 Usage

- Holder pays no rent when landing on a covered property
- Single-use tokens forfeit after one use
- Permanent tokens stay valid until voided

### 9.3 Disclosure

- All active tokens publicly visible on title deed cards
- Issuer must disclose all active tokens before any property sale or trade
- Failure to disclose voids the trade

### 9.4 Property sale by issuer

- Issuer must refund the holder per token type:
  - Single-use unused: full refund of recorded value
  - Single-use already used: no refund
  - Permanent: full refund of recorded value
- Token voided after refund
- If issuer can't pay refund: counts as a debt (can trigger bankruptcy)
- Exception: if buyer is also the token holder, no refund needed

### 9.5 Equity stake sale by issuer

- Tokens transfer to the buyer of the equity stake
- Buyer becomes new issuer of record and inherits future refund obligations

### 9.6 Bankruptcy of issuer

- Tokens issued by the bankrupt player remain valid against new owners

---

## 10. Kopitiam pot mechanic

### 10.1 What goes IN

- Income Tax (LHDN) and Luxury Tax (Cukai Mewah)
- Mortgage interest paid to bank (10% unmortgage fee)
- Jail release fee ($50)
- Chance/Community Chest "pay the bank" cards

### 10.2 What goes OUT

- Player landing **exactly** on Kopitiam (slot 20) wins the entire pot
- Pot resets to $0 after collection
- Just passing through Kopitiam does NOT trigger collection

### 10.3 Constraints

- Pot starts at $0 at game setup
- Player-to-player money never feeds the pot
- Pot value is publicly visible at all times

---

## 11. Functional requirements

### 11.1 Game state model

The system MUST track:

**Per-game state:**
- Player list (2–6), turn order, current turn
- Current lap count per player (for JV duration tracking)
- Kopitiam pot balance
- Card deck state (Chance + Community Chest, with shuffle and discard piles)
- Game phase: setup / active / ended
- Move history (for save/resume and undo)

**Per-player state:**
- Cash balance
- Position on board
- Solo-owned properties (list)
- Co-owned property stakes (list with equity %)
- Active JV partner (if any) + JV contract details
- Right of Passage tokens issued (as issuer) and held (as holder)
- Jail status (in jail Y/N, turns remaining, Get Out of Jail Free cards held)
- Bankruptcy flag

**Per-property state:**
- Owner(s) with equity splits
- Mortgage status
- Houses count (0–4) / hotel flag
- Active Right of Passage tokens issued on this property

### 11.2 Critical user flows

The system MUST support these flows end-to-end:

**Flow A: Landing on unowned property**
1. Player rolls and moves to the property
2. System offers: Buy (solo) / Buy (with co-owner) / Decline
3. If "Buy with co-owner": player selects partner; they negotiate equity split via UI; both pay proportional share
4. If decline: trigger auction (all eligible players bid; JV partners must designate)
5. Update property ownership and player cash

**Flow B: Landing on rent-collecting property**
1. System calculates rent based on: ownership configuration, monopoly status, building level, mortgage status
2. System checks: does lander hold an active Right of Passage on this property? If yes, no rent
3. System checks: is lander in JV with the owner/co-owner? If yes, apply JV refund logic
4. Distribute rent per equity (with rounding rule applied)

**Flow C: Building**
1. Player selects color group to build on
2. System validates: monopoly exists? consent of all relevant majority owners?
3. For co-owned properties: system prompts each co-owner for share payment
4. If a co-owner refuses: present negotiation UI (dilution at custom price, or force buyout at book value)
5. Update house count and player cash

**Flow D: Forming a JV**
1. Two players initiate JV from menu
2. UI captures: duration (default 5 laps), break fee (default $200/lap), any custom terms
3. Both players confirm
4. JV contract card created and visible to both

**Flow E: Issuing a Right of Passage token**
1. Property owner (or co-owners jointly) initiates
2. UI captures: recipient, scope (property/group/all), single-use vs permanent, recorded value
3. UI captures: what's being received in exchange (free-text or structured)
4. Both parties confirm
5. Token created and listed on relevant title deed(s)

**Flow F: Selling equity stake (with ROFR)**
1. Co-owner negotiates cash offer with third party
2. System notifies the other co-owner with offer details
3. Other co-owner choses: Match (pays) or Waive
4. Match → equity transfers to matching co-owner
5. Waive → equity transfers to third party; tokens transfer with stake

**Flow G: Bankruptcy**
1. System detects player can't pay a debt and has no convertible assets
2. Determine largest creditor
3. Transfer all assets per rules (cash + properties + tokens issued)
4. Co-owned shares: if creditor is the other co-owner, consolidate to 100%
5. Active tokens issued by bankrupt player remain valid against new owners
6. Mark player bankrupt; check win condition (1 player remaining = win)

### 11.3 UI requirements

- **Board view:** all 40 squares with player tokens, ownership indicators, building counts, and pot balance
- **Player dashboards:** cash, properties, JV status, tokens (visible to all)
- **Title deed cards:** purchase price, rent ladder, equity splits, mortgage status, active tokens
- **JV contract card:** partner names, lap counter, break fee, duration remaining
- **Right of Passage token card:** issuer, holder, scope, type (single/permanent), recorded value
- **Negotiation modals:** for co-purchase, building dilution, ROFR decisions, JV formation, token issuance
- **Decision matrix reference:** quick access to "what requires what consent" rule lookup
- **Move history / log:** scrollable record of all game events for dispute resolution

### 11.4 Save/resume

- Game state serializes to JSON
- Auto-save after every turn
- Manual save slots (3 minimum)
- Resume restores exact state including move history

---

## 12. Non-functional requirements

- **Performance:** Turn transitions <500ms; UI animations <300ms
- **Reliability:** No data loss on browser refresh during a turn
- **Accessibility:** Color-blind safe property color schemes; keyboard navigation for all flows; screen reader labels
- **Browser support:** Latest 2 versions of Chrome, Safari, Firefox, Edge
- **Responsive:** Tablet (1024x768) minimum; mobile (375x667) is v2
- **Local-first:** All game logic runs client-side; no server dependency for v1

---

## 13. Acceptance criteria (v1 launch)

The game ships when:

1. ✅ Two players can complete a full game (start to last-solvent winner) without rule ambiguity
2. ✅ All 7 critical user flows (Section 11.2) work end-to-end
3. ✅ All 9 design stress tests (from design doc) produce the documented outcomes in-game
4. ✅ State save/resume preserves exact game state across browser sessions
5. ✅ Decision matrix reference card is accessible from any screen
6. ✅ At least 3 external playtest sessions completed with feedback incorporated
7. ✅ No P0 bugs (game-breaking, state-corrupting) in the bug tracker
8. ✅ Onboarding flow gets a Monopoly-familiar player into their first move within 5 minutes

---

## 14. Open questions / decisions needed before vibe coding

1. **Tech stack:** React + TypeScript + Tailwind? Vite or Next.js? State management library (Zustand, Redux, Jotai)?
2. **Persistence:** localStorage for v1, or do we want IndexedDB for richer state?
3. **Visual design language:** flat/modern, or skeuomorphic to evoke board game feel?
4. **Negotiation UI patterns:** modal-based (blocking) or panel-based (non-blocking)?
5. **Move history depth:** full event log or summarized turn log?
6. **Rule enforcement:** strict (system blocks invalid moves) or permissive (allows manual overrides for house rules)?

---

## 15. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Negotiation flows feel clunky in digital format | High | High | Prototype 1-2 flows first; user-test before building all |
| Co-ownership rules too complex for casual players | Medium | High | Strong onboarding + decision matrix reference card |
| Game length runs longer than 3 hours | Medium | Medium | Add optional "speed game" variant in v2 |
| Rule edge cases discovered during play | High | Medium | Comprehensive move history + manual override allowance |
| Players abuse open information to bully weaker player | Medium | Medium | This is intentional design; mitigate via JV reputation effects |

---

## 16. Future scope (v2+)

- Online multiplayer (turn-based or real-time)
- AI opponents with configurable strategies (aggressive negotiator, conservative builder, etc.)
- Custom city editor (maps for other cities — Singapore, Jakarta, etc.)
- Achievements and stats tracking
- Spectator mode
- Replay system
- Customizable house rules
- Mobile-native apps

---

## Appendix A: Design philosophy reference

- **Open information** — all cash, properties, tokens, and contracts are visible to all players
- **Negotiation is the game** — every meaningful action is a deal opportunity
- **Cash is the worst asset** — idle cash should feel like opportunity cost
- **Strategic depth via interaction** — outcomes flow from decisions and relationships, not luck
- **Familiar surface, novel depth** — Monopoly DNA preserved; investment mechanics layered on top

## Appendix B: Glossary

- **Co-ownership:** two players holding equity in a single property
- **Equity share:** percentage of ownership in a co-owned property (min 25%, sums to 100%)
- **Joint Venture (JV):** formal 2-player alliance with auto-passage and auction non-compete
- **Right of Passage token:** negotiable rent waiver covering one property, color group, or all of issuer's current properties
- **Kopitiam pot:** central pot fed by taxes and bank fees; collected by player landing on Kopitiam corner
- **ROFR:** Right of First Refusal — match-or-waive mechanic when co-owner sells stake to third party
- **Force buyout:** majority co-owner's right to acquire minority stake at book value when minority blocks operational decisions
- **Monopoly holder:** any player with equity in every property of a color group

---

*End of document.*

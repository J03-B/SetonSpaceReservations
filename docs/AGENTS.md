# AI agent instructions

Before any product, design, or engineering work on this repository:

1. Read [`docs/seton-space-reservations-masterplan.md`](seton-space-reservations-masterplan.md)
2. Read [`docs/seton-space-reservations-style-guide.md`](seton-space-reservations-style-guide.md)
3. Check open decisions in masterplan §36
4. State assumptions in your work output

## Key rules (non-exhaustive)

- Public calendar shows **status and time only** — never requester or event details
- **Requester access approval** is separate from **reservation approval**
- Seton domain users get requester access automatically; they still need manager approval for reservations
- External users cannot submit reservation requests until Tech Admin approves requester access
- Enforce authorization server-side; never trust client-supplied roles
- Use configuration (database) for spaces, domains, and managers — do not hard-code in reusable components
- Prevent overlapping approved reservations at the database layer

## Delivery phases

See masterplan §32. Current target: **Phase 1 — Foundation**.

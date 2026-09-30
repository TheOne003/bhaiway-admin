# Phase 9 — Production Readiness

## Executive Summary

Phases 1–8 deliver a **fully functional mock-based BhaiWay Admin** with strong domain modeling, UI coverage, and regression tests. Phase 9 hardens **security boundaries, authorization contracts, session handling, headers, rate-limit/observability abstractions, and documentation**.

**Verdict:** suitable for continued development and **internal/staging mock environments**. **Not suitable for production** until real authentication, persistent data stores, shared rate limiting, production realtime, and external providers are configured.

Status: **PASS WITH EXTERNAL DEPENDENCIES**

---

## Architecture Audit

Preserved pattern:

```text
UI → Providers/Hooks → Services → Provider Abstractions → Mock | Real
```

Business logic remains in services. Phase 9 adds **server-side** session, authz helpers, validation, rate-limit, and observability modules under `src/server/`.

Frontend `PermissionGuard` remains **UX only**. Canonical permission IDs stay in `src/types/permission.ts`.

---

## Security Findings

| Sev | Finding | Phase 9 action |
|-----|---------|----------------|
| CRITICAL | Password in client `MOCK_LOGIN` / `.env.example` | Removed from client constants; example uses placeholder |
| CRITICAL | JS-writable session cookie / forgeable token | Server opaque sessions + HttpOnly `Set-Cookie` |
| CRITICAL | Proxy checked cookie presence only | Proxy validates against server session store |
| HIGH | RBAC UI-only | Added `requireAdminSession` / `requirePermission` + `/api/authz/check` |
| HIGH | No security headers | Added CSP (moderate), frame deny, nosniff, referrer, permissions-policy |
| HIGH | Domain mutations still client/mock (no API surface) | Documented — production APIs required |
| MEDIUM | Login abuse | In-memory rate limit + production shared-store requirement |
| MEDIUM | DevEventSimulator always in shell graph | Dynamic import; null in production |
| MEDIUM | Timing-unsafe password compare | `timingSafeEqual` via `safeEqualString` |

---

## Authentication

**Current:** Single admin via `ADMIN_LOGIN_ID` / `ADMIN_PASSWORD` env.

**Hardened:**

- `POST /api/auth/login` — rate limited, validates input, sets **HttpOnly** session cookie, **does not return token in JSON**
- `GET /api/auth/session` — validates/refreshes server session
- `POST /api/auth/logout` — destroys server session + clears cookie
- Client `authService` caches public admin profile only; never stores password
- Session cookie is **HMAC-signed** (works across Next.js proxy/route isolates). Optional local revocation set is single-process only.

**Production required:** OIDC/SAML/IdP or first-party auth service; Redis/DB session revocation; MFA; dedicated `SESSION_SECRET`.

---

## Authorization / RBAC

**Canonical IDs:** `PermissionId` in `src/types/permission.ts`.

**Server helpers:** `src/server/authz.ts`

```text
Authenticated Admin → Role → Permission IDs → requirePermission() → action
```

**UI:** `PermissionGuard` is explicitly documented as non-authoritative.

**Gap:** Most domain actions still run in browser mock services. Production must expose mutation APIs that call `requirePermission` for every consequential action.

---

## API Security

| Route | Auth | Notes |
|-------|------|-------|
| `POST /api/auth/login` | Public | Rate limited |
| `GET /api/auth/session` | Cookie | Returns public session |
| `POST /api/auth/logout` | Public/cookie | Clears session |
| `GET /api/authz/check` | Session + permission | Contract probe |

Unauthenticated `/api/*` (non-public) receive **401 JSON** from proxy (no HTML redirect).

---

## Financial Integrity

Ledger-first model retained (`transactions.ts`):

```text
Business Action → Ledger Entry → Derived Wallet Balance
```

Integer paise; idempotency index for adjustments/credits/refunds/referrals.

**Production DB requirements:**

- UNIQUE constraint on `idempotency_key` (nullable unique / partial index)
- Serializable or equivalent transactional writes for ledger + wallet derivation
- Append-only ledger (reversals as new rows)

---

## Audit Logging

Append-only in-memory `auditService` with secret scrubbing.

**Production:** immutable/append-only store, retention policy, correlation IDs, no secrets/PII.

---

## Realtime

`RealtimeService` interface + `MockRealtimeService`. Documented production adapter needs: auth, reconnect, dedupe by `event.id`, durable SOS fan-out.

Mock bus is **not** production realtime.

---

## Notifications / Verification / Safety / Maps

| Area | Current | Production |
|------|---------|------------|
| Notifications | Mock engine + providers | Real SMS/email/push providers + queue |
| Verification | MockVerificationProvider | KYC providers; masked IDs only |
| Safety/SOS | In-memory transitions | Durable SOS store + ack/escalation SLA |
| Maps/GPS | Mock map provider | Real map/GPS; validate coordinates |

---

## Persistence

All major domain stores are **in-memory/mock**. Production needs DB for: users, drivers, verification, rides, SOS/incidents, assured rides, ledger/wallets/deposits/refunds/credits, coupons/referrals, notifications, support, audit, admins/roles, settings, **idempotency records**, **sessions**.

---

## Observability

`src/server/observability.ts` — request IDs, scrubbed structured logs. Wire to APM later.

---

## Performance

No broad premature optimization. Dynamic exclusion of DevEventSimulator from production bundles. Map/table virtualization remains a future ops concern.

---

## Accessibility

Existing Phase 1–8 a11y patterns retained; Phase 9 did not redesign UI. Recommend periodic axe/keyboard audit before go-live.

---

## Environment / Secrets

- `.gitignore` ignores `.env*` except `.env.example`
- `.env.example` uses **placeholder** password
- Client `constants.ts` has **no password**
- Test/e2e credentials live in Node-only modules (`src/test/credentials.ts`, `e2e/credentials.ts`)

---

## Deployment Readiness

- `poweredByHeader: false`
- Security headers enabled
- Dev simulator gated
- Sessions single-process — **not multi-instance ready**

---

## Remaining External Dependencies

1. Real authentication provider / IdP  
2. Persistent database + migrations  
3. Shared session + rate-limit store (Redis/gateway)  
4. Production realtime (WS/SSE/pubsub)  
5. Verification / maps / SMS / email / payment / OTP providers  
6. Centralized logging/error tracking  
7. Edge/WAF rate limiting & bot protection  
8. Backup/retention/incident process  

---

## Known Limitations

- Domain authorization not yet enforced on every mock mutation (no full API surface)
- In-memory limiter/session store
- Moderate CSP allows `'unsafe-inline'` / `'unsafe-eval'` for Next.js compatibility
- Single bootstrap admin

---

## Production Go-Live Checklist

### Security
- [ ] Real authentication provider configured
- [ ] Backend RBAC enforced on all mutation APIs
- [ ] Secrets in secret manager (not repo)
- [ ] Security headers verified in staging
- [ ] Shared rate limiting configured
- [ ] Sensitive logs scrubbed
- [ ] HttpOnly Secure cookies + CSRF strategy verified

### Data
- [ ] Production DB configured
- [ ] Ledger transactions + UNIQUE idempotency constraints verified
- [ ] Audit persistence + retention configured
- [ ] Backup/restore tested

### Realtime
- [ ] Production realtime provider configured
- [ ] Reconnect + SOS durability verified

### External Providers
- [ ] Verification / Maps / SMS / Email / Payment / OTP

### Operations
- [ ] Monitoring + error tracking
- [ ] On-call / incident process
- [ ] Admin access review

---

## Severity Summary

| Severity | Open for production |
|----------|---------------------|
| CRITICAL | Real auth + persistence + multi-instance sessions still required |
| HIGH | Full mutation API RBAC surface; external providers |
| MEDIUM | CSP tightening; distributed rate limits; observability backend |
| LOW | MFA; broader PermissionGuard coverage on remaining pages |

---

## Provider Inventory

| Provider | Current | Status |
|----------|---------|--------|
| Authentication | Env + server session | NOT PRODUCTION READY |
| Maps | MockMapProvider | PROVIDER REQUIRED |
| Verification | MockVerificationProvider | PROVIDER REQUIRED |
| SMS/Email/Push | Mock | PROVIDER REQUIRED |
| Payment | Mock health only | PROVIDER REQUIRED |
| Realtime | MockRealtimeService | PROVIDER REQUIRED |
| Database | In-memory | REQUIRED |
| Rate limit | In-memory | SHARED STORE REQUIRED |

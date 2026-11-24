# Security Specification — ArchePaw PRO

## Phase 0: Data Invariants & Access Control Matrix

| Collection | Read (`get`/`list`) | Create | Update | Delete |
|---|---|---|---|---|
| `/users/{userId}` | Owner only (`auth.uid == userId`, verified email) | Owner only; `uid == auth.uid`; `createdAt == request.time`; `updatedAt == request.time` | Owner only; `uid` & `createdAt` immutable; `updatedAt == request.time` | Owner only |
| `/users/{userId}/servers/{serverId}` | Owner only (`auth.uid == userId`, verified email) | Owner only; `ownerId == auth.uid`; `id == serverId`; `createdAt == request.time`; `updatedAt == request.time` | Owner only; `id`, `ownerId`, `createdAt` immutable; `updatedAt == request.time` | Owner only |
| `/users/{userId}/history/{historyId}` | Owner only (`auth.uid == userId`, verified email) | Owner only; `ownerId == auth.uid`; `id == historyId`; `createdAt == request.time` | Owner only; `id`, `ownerId`, `createdAt` immutable | Owner only |
| All other paths | DENY | DENY | DENY | DENY |

## Field Validation & Constraints
- **UserProfile**:
  - `hasAll` & `hasOnly`: `['uid', 'nickname', 'avatarData', 'avatarKind', 'createdAt', 'updatedAt']`
  - `uid`: string, `== request.auth.uid`
  - `nickname`: string, length 1..20
  - `avatarData`: string, length 0..180000
  - `avatarKind`: enum in `['preset', 'google', 'upload']`
  - `createdAt`, `updatedAt`: timestamp, server time verified
- **SavedServer**:
  - `hasAll` & `hasOnly`: `['id', 'ownerId', 'name', 'code', 'lastPlayedAt', 'createdAt', 'updatedAt']`
  - `id`: string, `== serverId`, valid ID (`^[a-zA-Z0-9_-]{1,40}$`)
  - `ownerId`: string, `== request.auth.uid`
  - `name`: string, length 1..32
  - `code`: string, matches `^[a-zA-Z0-9_-]{1,28}$`
  - `lastPlayedAt`: number, `>= 0`
- **PlayHistoryEntry**:
  - `hasAll` & `hasOnly`: `['id', 'ownerId', 'code', 'serverName', 'directConnect', 'playedAt', 'createdAt']`
  - `id`: string, `== historyId`, valid ID (`^[a-zA-Z0-9_-]{1,40}$`)
  - `ownerId`: string, `== request.auth.uid`
  - `code`: string, matches `^[a-zA-Z0-9_-]{1,28}$`
  - `serverName`: string, length 0..32
  - `directConnect`: bool
  - `playedAt`: number, `>= 0`

## Dirty Dozen Attack Payloads Verified
1. **Unauthenticated read/write** -> Denied (`isAuthenticated()` requires `request.auth != null && request.auth.token.email_verified == true`).
2. **Cross-user profile/server/history read or list** -> Denied (`isOwner(userId)` binds path `{userId}` strictly to `request.auth.uid`).
3. **Owner hijack on create/update** (`ownerId` or `uid` mutated) -> Denied (immutable field checks + `ownerId == request.auth.uid`).
4. **Unexpected field injection** (e.g., `role: 'admin'`, `isAdmin: true`) -> Denied (`hasOnly` + `affectedKeys().hasOnly()`).
5. **Timestamp forgery** (`createdAt` or `updatedAt` forged to past/future) -> Denied (`== request.time`).
6. **Oversized avatar DoS payload** (> 180KB string) -> Denied (`avatarData.size() <= 180000`).
7. **Empty or excessively long nickname / server name / invalid code** -> Denied (bounds + regex checks).
8. **Path traversal / malformed document IDs** -> Denied (`isValidId()` regex).
9. **Blanket collection enumeration** -> Denied (default deny `match /{document=**}` + no global list rule).
10. **Unverified email token access** -> Denied (`request.auth.token.email_verified == true`).
11. **Direct-connect type confusion** (`directConnect: "true"` string) -> Denied (`is bool`).
12. **Negative/NaN numeric timestamps** (`playedAt: -100`) -> Denied (`is number && >= 0`).

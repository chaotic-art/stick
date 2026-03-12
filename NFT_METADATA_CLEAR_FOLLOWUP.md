# NFT Metadata Clear Follow-up

## Issue

`ItemMetadataCleared` for an NFT currently returns early in:

- `src/mappings/nfts/setMetadata.ts`
- `src/mappings/uniques/setMetadata.ts`

That means we do not handle NFT-level metadata clear at all.

This became important while adding normalized NFT attributes, but it was split out of that PR because the correct fix also touches token-link behavior and should be reviewed separately.

## Why It Matters

If we add NFT metadata clear handling naively, we can introduce a token consistency bug:

1. NFT is already linked to a `TokenEntity`
2. metadata clear removes `image` and `media`
3. code returns before unlinking the old token
4. `nft.token_id`, token `count`, and token `supply` stay stale

Result:

- the NFT no longer has media
- but token queries can still show it under the old token

## Goal Of Follow-up PR

Add correct NFT metadata clear handling for both `nfts` and `uniques` without leaving stale `TokenEntity` links behind.

## Scope

### In scope

- handle NFT/item metadata clear events in:
  - `src/mappings/nfts/setMetadata.ts`
  - `src/mappings/uniques/setMetadata.ts`
- clear NFT metadata-backed fields:
  - `metadata`
  - `meta`
  - `name`
  - `image`
  - `media`
- unlink the NFT from its current `TokenEntity` when needed
- update token `count` and `supply`
- keep normalized NFT attributes and rarity state in sync after clear

### Out of scope

- collection metadata clear behavior
- unrelated token grouping changes
- broader metadata refactors

## Proposed Changes

### 1. Add a dedicated unlink helper

Add a shared helper in:

- `src/mappings/shared/token/setMetadata.ts`

Suggested shape:

```ts
unlinkNftTokenHandler(context, nft)
```

Behavior:

- load NFT with current `token`
- if token exists, remove NFT from token
- update token counts/supply
- leave if no token exists

### 2. Use unlink before exiting clear paths

In both NFT metadata handlers:

- detect NFT-level metadata clear
- clear NFT metadata fields
- save the NFT
- call token unlink helper
- mark rarity dirty
- mark normalized attributes dirty
- return

### 3. Make shared token metadata handling safe for missing media

Current `setMetadataHandler()` computes a new token id from NFT media.

That is a problem because after metadata clear:

- `generateTokenId()` returns `undefined`
- old token cleanup can be skipped if unlink happens after token-id generation

The follow-up PR should make sure unlink can happen even when the NFT no longer has media.

Two acceptable options:

1. Reorder `setMetadataHandler()` so unlink happens before token-id generation.
2. Keep `setMetadataHandler()` as-is and call a dedicated unlink helper from the clear paths.

Preferred option:

- use a dedicated unlink helper for clear paths
- only reorder `setMetadataHandler()` if needed for broader safety during metadata updates

## Expected Behavior After Fix

When NFT metadata is cleared:

- NFT metadata-derived fields are removed
- NFT is unlinked from any stale `TokenEntity`
- token `count` and `supply` are recalculated correctly
- normalized attribute rows derived from metadata fallback are removed on the next dirty flush
- rarity can be recomputed from the new effective attribute state

## Test Plan

Add focused tests for:

1. NFT metadata clear with existing token link
   - NFT starts linked to a token
   - metadata clear runs
   - NFT token relation becomes null
   - old token count/supply decrease correctly

2. NFT metadata clear with no token link
   - clear does not throw
   - NFT remains unlinked

3. Metadata clear removes metadata-backed display fields
   - `metadata`, `meta`, `name`, `image`, `media` become null/undefined as expected

4. Metadata clear marks derived systems dirty
   - rarity marked dirty
   - normalized attributes marked dirty

5. Uniques path behaves the same as nfts path

## Acceptance Criteria

- NFT metadata clear is handled for both `nfts` and `uniques`
- no stale `nft.token_id` remains after clear
- token counts/supply remain correct after clear
- no regression to normal metadata set/relink behavior
- normalized NFT attributes still work unchanged

## Notes

Current code intentionally leaves this as a TODO in:

- `src/mappings/nfts/setMetadata.ts`
- `src/mappings/uniques/setMetadata.ts`

That TODO exists so the normalized-attributes PR stays cohesive and the token-unlink bugfix can land separately.

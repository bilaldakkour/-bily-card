# Manual Catalog Migration Plan

## Goal
- Move catalog ownership to manual products only.
- Keep providers as backend links for pricing/execution only.
- Preserve order history, auth, wallet, and current refund/failure behavior.

## Phase 1 (Now, Safe Rollout)
- Keep `CATALOG_SOURCE_MODE=hybrid`.
- Stop creating provider-owned catalog products by default:
  - `ENABLE_PROVIDER_OWNED_PRODUCT_WRITES=false`.
- Manage products from `Products Control Center` (manual-first).
- Use provider links with:
  - `enabled`
  - `executionEnabled`
  - `priceSyncEnabled`
  - `priority`
  - `lastCost/lastKnownCost`
  - `healthStatus`
  - `lastError`
  - optional `variantKey`
- Enable pricing order:
  - cheapest provider cost
  - margin
  - customer discount

## Old Products Strategy

### Go4Card legacy products
- Keep legacy data for history only.
- Stop listing legacy provider-owned rows as the primary source.
- Re-link active sellable manual products to Go4Card using provider links (same package/variant mapping).

### DailyCard legacy products
- Keep legacy data for history only.
- Continue price/order sync only via provider links.
- Move active sellable entries to manual products with mapped provider links.

## Listing/Archive Rules
- Legacy provider-owned products: `hide/stop listing` (do not hard-delete initially).
- Keep DB rows for historical reconciliation and auditing.
- Orders table/history remains unchanged because it references stored order snapshots.

## Data Mapping Steps
1. Export current live sellable slugs and their package options.
2. Create manual products for each target slug/category/image/description.
3. Add per-variant links using `variantKey` (or package-scoped links).
4. Fill `lastCost` and `lastSyncAt` for each link.
5. Configure product/variant margin.
6. Verify admin preview values.
7. Run test orders per top products (success + fallback + refund path).

## Switch Readiness Checklist
- Manual replacement exists for all active customer-facing products.
- Each active variant has at least one valid provider link OR manual-only mode.
- No customer-facing page still depends on provider-owned catalog rows.
- Pricing preview validated on top products and at least one discounted user.

## Final Switch
- Set:
  - `CATALOG_SOURCE_MODE=manual_only`
- Expected result:
  - providers no longer act as catalog source
  - providers remain execution/pricing backend links only
  - legacy provider-owned products remain archived for history

## Rollback
- Immediate rollback:
  - `CATALOG_SOURCE_MODE=hybrid`
- Emergency rollback for legacy write behavior:
  - `ENABLE_PROVIDER_OWNED_PRODUCT_WRITES=true`

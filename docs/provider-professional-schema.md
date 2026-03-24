# Provider Professional Schema (Step 1)

This step introduces data models only. No routing behavior changed in this step.

## New Models

1. `ProviderRegistry`
- One row per provider (`dailycard`, `go4card`, future providers).
- Includes:
  - provider identity (`providerKey`, `displayName`, `adapterKind`)
  - operational switches (`enabled`, `routing.allowOrderCreation`, `routing.allowSync`)
  - financial adjustment:
    - `financial.landingRate` (example: sent `100`, received `99` => `0.99`)
    - `financial.fixedFeePerOrder`
    - `financial.variableFeePercent`
    - top-up tracking (`topupSentUsd`, `topupReceivedUsd`)

2. `ProductProviderMatrix`
- One row per internal product slug.
- Includes:
  - product routing mode (`cheapest` / `priority` / `forced`)
  - list of provider routes for the product (`routes[]`)
    - `providerKey`, `providerProductId`, `providerProductName`
    - `active`, `fallbackEnabled`, `priority`, optional `fixedUnitCost`

## Why this structure

- Supports any number of providers per product.
- Supports per-provider real financial adjustment.
- Keeps product-level control centralized and simple for admin UI.

## Next Step (Step 2)

- Add admin APIs to:
  - manage `ProviderRegistry`
  - manage `ProductProviderMatrix`
  - show readiness dashboard (`missing`, `single`, `multi`)

## Step 2 Implemented API Endpoints

1. `GET /api/admin/providers/registry`
- Query params:
  - `providerKey` (optional)
  - `enabled=1|0` (optional)

2. `POST /api/admin/providers/registry`
- Upsert provider registry row.
- Required: `providerKey`

3. `PATCH /api/admin/providers/registry`
- `action=toggle_enabled` with `enabled: boolean`
- `action=update_financial` with optional:
  - `landingRate`, `fixedFeePerOrder`, `variableFeePercent`
  - `topupSentUsd`, `topupReceivedUsd`, `notes`

4. `DELETE /api/admin/providers/registry`
- Soft disable by default.
- Hard delete if `{ hard: true }`

5. `GET /api/admin/providers/matrix`
- With `action=dashboard`: readiness summary for all catalog products
- With `slug`: single product matrix
- Without params: latest matrix rows

6. `POST /api/admin/providers/matrix`
- Full upsert for one product matrix.
- Required: `internalSlug`

7. `PATCH /api/admin/providers/matrix`
- `action=set_policy`
- `action=remove_route`
- `action=replace_routes`
- default: upsert one route on product

8. `DELETE /api/admin/providers/matrix`
- Delete full matrix row by `internalSlug`

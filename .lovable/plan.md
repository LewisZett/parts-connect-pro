# Boosted Ad Slots — Competitive Bidding System

Replace the current "boost" model with a 5-slot auction-style ad system on the homepage.

## Data model (new tables)

**`ad_slots_config`** (single-row settings, admin-managed)
- `reserve_price` (numeric, default 1.0 Pi)
- `min_increment_pct` (numeric, default 15)
- `guaranteed_hours` (int, default 48)
- `total_slots` (int, default 5)

**`ads`**
- `id`, `user_id`, `part_id` (nullable — can reference a listing or be standalone)
- `business_name`, `image_url`, `link_url`
- `bid_amount` (numeric)
- `slot_position` (int 1–5, nullable when waiting)
- `placed_at` (timestamptz)
- `guaranteed_until` (timestamptz)
- `status` ('active' | 'waiting' | 'expired' | 'removed')
- `payment_id` (ref to `pi_payments`)
- timestamps

**`bids_history`** (audit log)
- `id`, `ad_id`, `user_id`, `amount`, `action` ('placed' | 'outbid' | 'promoted' | 'expired'), `timestamp`

**`user_roles`** + `app_role` enum + `has_role()` (admin role — for admin controls)

RLS: ads readable by everyone (active/waiting); insert/update by owner or service role; admin can remove any. Config readable by all, writable by admin only. Bids history readable by ad owner + admin.

## Edge functions

**`place-ad-bid`** (JWT required)
1. Validate input (Zod): business_name, image_url, link_url, bid_amount, optional part_id.
2. Load config + current active ads ordered by bid desc.
3. Decide outcome:
   - If active count < 5 AND bid ≥ reserve → create Pi payment intent, mark ad pending.
   - Else find lowest active bid. If `bid ≥ lowest * (1 + min_increment_pct/100)`:
     - If lowest's `guaranteed_until > now()` → still allow bid but new ad goes to waiting queue (lowest is guaranteed). Actually: lowest can be displaced ONLY if its guaranteed period passed. If not passed → waiting.
     - If guaranteed expired → displace: mark old as 'expired', insert new as active, log 'outbid'.
   - Else → waiting pool.
4. Return outcome to client to trigger Pi payment.

**`finalize-ad-payment`** (called after Pi `pi-payments` completes)
- Sets `placed_at = now()`, `guaranteed_until = now() + guaranteed_hours`, status='active' or 'waiting', assigns `slot_position` by rank.
- Logs to `bids_history`.

**`process-ad-slots`** (cron, every 10 min)
- For each active ad with `guaranteed_until < now()`: check waiting pool. If highest waiting bid beats current lowest by min increment → promote (status='active'), demote current to 'expired', recompute positions.
- Send notifications (outbid / expiring soon / promoted) via existing `send-match-notification` pattern (Resend already configured).

**`admin-remove-ad`** (JWT + admin role)
- Force expire an ad, trigger queue check.

## Frontend changes

- `src/pages/Dashboard.tsx` — replace existing boosted marquee with `<AdSlotsShowcase />` showing 5 ranked slots (slot #1 largest), each with image, business name, link, and "Xd Yh guaranteed" countdown. Keep the scrolling-marquee aesthetic for the row but ranked left-to-right by bid.
- `src/components/AdSlotsShowcase.tsx` — new. Realtime subscription to `ads` table.
- `src/components/PlaceAdDialog.tsx` — new. Form (business name, image upload to `part-images`, link, bid amount). Shows current lowest bid + required minimum. Calls `place-ad-bid` → triggers Pi payment via existing `usePiPayments` → calls `finalize-ad-payment`.
- `src/components/BoostListingButton.tsx` — repurpose: opens `PlaceAdDialog` prefilled from the listing.
- `src/pages/AdminAds.tsx` — new admin page (route `/admin/ads`, guarded by `has_role(uid, 'admin')`): edit reserve/increment/guaranteed hours, view all ads + waiting queue, remove ads.
- Sidebar: add "Admin" link visible only when user has admin role.
- Notifications: in-app toast on realtime ad changes affecting current user; email via edge function.

## Notifications

Reuse Resend. New edge function `notify-ad-event` invoked by `process-ad-slots` and `place-ad-bid` for: outbid, expiring-soon (6h before `guaranteed_until`), promoted-from-waiting.

## Out of scope (v1)

- Refunds / proration (explicitly non-refundable).
- Bid targeting specific slots.
- Auto-renew.

## Migration of existing data

Existing `parts.boosted_until` column stays for backward compatibility but the Dashboard no longer reads from it. Old boosted parts simply stop appearing in the new showcase; no data deleted.

---

Approve to proceed and I'll create the migration, edge functions, and UI in that order.
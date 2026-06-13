# Pending Backend Endpoints

Features that were shipped on the frontend with a stopgap (or stubbed) because a
proper implementation needs **new backend work**. Each section is a proposal for
the endpoint(s) required to finish the feature properly.

---

## 1. Buy Now — direct (card/Paystack) checkout

**Why:** The feed's **Buy Now** button currently adds the item to the cart and then
calls the existing wallet checkout (`POST /payment/create-order/`), i.e. it pays
from the wallet balance. There is no way to pay a single item directly via card.

**Need:** an endpoint that initiates payment for one product (no cart) and returns
a Paystack authorization URL / reference to redirect to.

```
POST /payment/buy-now/
Auth: required
Body:
{
  "product_id": 55,
  "quantity": 1
}
Response (200):
{
  "authorization_url": "https://checkout.paystack.com/abc123",
  "reference": "ref_abc123",
  "amount_naira": 1500.00
}
```

**Notes:**
- Should create a pending order tied to the reference, then confirm it on the
  Paystack webhook / verify callback (reuse the existing payment verification flow).
- Avoids the add-to-cart + create-order workaround the frontend does today.

---

## 2. Bookmarks (server-side persistence)

**Why:** Bookmarks (save a Kauch post) are currently stored only in the browser
(`localStorage`), so they don't sync across devices or survive a cache clear.

**Need:** persist bookmarks per user.

```
POST   /kauch/posts/{post_id}/bookmark/   → toggle; returns { "bookmarked": true }
GET    /kauch/bookmarks/                   → list the user's bookmarked posts (Post objects)
```

**Notes:**
- New model: `Bookmark(user, post, created_at)` with `unique_together(user, post)`.
- Optionally add `is_bookmarked_by_user` to `PostSerializer` so the feed can show
  saved state without a second request.

---

## 3. Share count tracking

**Why:** The feed shows a share count, but it is always `0` — sharing isn't recorded
server-side. `shares_count` is hard-coded in the frontend mapping.

**Need:** record a share and expose the count.

```
POST /kauch/posts/{post_id}/share/   → increments; returns { "shares_count": 13 }
```

**Notes:**
- Add `shares_count` (PositiveIntegerField, default 0) to `PostModel` and include it
  in `PostSerializer`. Increment on share (optionally dedupe per user with a
  `PostShare` table if real metrics are wanted).

---

## 4. (Optional) Deep comment nesting

**Why:** Comment replies are intentionally **two levels** (a top-level comment and a
flat list of replies, TikTok-style). Replying to a reply stays in the same thread and
@mentions the user.

**Need (only if true unlimited nesting is desired):** the `parent` self-FK already
exists on `PostComment`, so the data model supports arbitrary depth — but the API
returns a flat list and the UI renders two levels. Supporting deep trees would mean
returning nested children (or a depth field) and a recursive UI. Flagged as a larger
change, not required for the current behaviour.

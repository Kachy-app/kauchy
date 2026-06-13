# Backend Changes — Reference

Backend contract for recent feature work. See `kauch_api_contract.md` for the full
Kauch endpoint reference (updated with media/comment changes).

---

## Migrations to apply

```bash
python manage.py migrate
```

| App | Migration | Change |
|-----|-----------|--------|
| kauch | `0002_postmodel_media_urls` | Add `media_urls` (JSON list) to `PostModel` |
| kauch | `0003_alter_postmodel_media_type` | Add `audio` to `media_type` choices |
| kauch | `0004_postcomment_parent` | Add nullable self-FK `parent` to `PostComment` (replies) |
| Products_app | `0010_product_specs` | Add `specs` (JSON dict) to `Product` |

All four are additive/backward-compatible; no data backfill required.

---

## Kauch — model & behaviour changes

### `PostModel`
- `media_urls = JSONField(default=list)` — ordered list of media URLs.
- `media_url` (legacy `TextField`) is kept and set to `media_urls[0]`.
- `media_type` now allows `image` | `video` | `audio`.

A post is **one video, one voice note (audio), or 1..N images** — never mixed.
The create view (`POST /kauch/{kauch_id}/posts/`) reads all files via
`request.FILES.getlist("media")` and validates this rule (400 on violation).
Audio is uploaded to Cloudinary with `resource_type="video"` (Cloudinary stores
audio under the video resource type).

The serializer's `media_urls` falls back to `[media_url]` for posts created before
this change, so old posts still return a non-empty list.

> Video delivery now uses `f_auto,q_auto:best` (was `q_auto`) in
> `kauch/utils.py::cloudinary_video_delivery` for higher playback quality.

### `PostComment`
- `parent = ForeignKey('self', null=True, blank=True, related_name='replies')`.
- Top-level comments have `parent=null`; replies set it to the parent comment id.
- `POST .../comments/` accepts an optional `parent`; a `parent` not on the same
  post is ignored. List endpoint returns a flat array including `parent`.

### New endpoint
- `GET /kauch/posts/{post_id}/` → single post (powers shareable post pages / OG tags).

---

## Products — custom attributes (`specs`)

### `Product`
- `specs = JSONField(default=dict, blank=True)` — freeform vendor-defined
  attributes, e.g. `{"Size": "M", "Colour": "Red"}`. Optional.

### Create — `POST /products/create` (multipart/form-data)
- New optional field `specs`: a **JSON string** of a flat `{label: value}` object,
  e.g. `specs={"Size":"M","Colour":"Red"}`. The view `json.loads` it into a dict;
  invalid JSON falls back to `{}`.

### Update — `PUT /products/{id}` (application/json)
- Accepts `specs` as a JSON object directly (no string encoding needed); it flows
  straight into the serializer's `JSONField`.

### Read — `GET /products/...`
- `ProductSerializer` uses `fields = "__all__"`, so `specs` is returned automatically
  on every product payload.

---

## Endpoints reused without backend changes
- **Chat voice messages** reuse `POST /chat/upload/` (the existing `file` field on
  `MessageModel`). No backend change — audio is just another uploaded file.
- **Buy Now** reuses `POST /cart/cart-items/{product_id}` then
  `POST /payment/create-order/`. No backend change.
- **Bookmarks** are client-side only (localStorage); no backend involvement.

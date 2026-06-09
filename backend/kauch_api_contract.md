# Kauch API Contract

This document defines the REST API endpoints, request payloads, and expected JSON responses for the Kauch features. This contract ensures the frontend and backend can integrate seamlessly.

## General Concepts
- **Kauch**: Acts like a WhatsApp Channel. A vendor can own up to 2 Kauches. Only the owner can post.
- **Kauch Post**: A post within a Kauch containing text, media (image/video), and a list of tagged products.

---

## 1. Kauches

### 1.1 List Vendor's Kauches
**Endpoint:** `GET /kauch/my-kauches/`
**Auth Required:** Yes (Vendor only)
**Description:** Returns the list of Kauches owned by the currently authenticated vendor.
**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Tech Gadgets Insider",
    "description": "All about the latest tech.",
    "avatar_url": "https://example.com/avatar.jpg",
    "followers_count": 120,
    "created_at": "2026-06-04T10:00:00Z"
  }
]
```

### 1.2 Create a Kauch
**Endpoint:** `POST /kauch/`
**Auth Required:** Yes (Vendor only)
**Description:** Creates a new Kauch. Fails (400) if the vendor already has 2 Kauches.
**Request Payload (multipart/form-data):**
- `name` (string)
- `description` (string)
- `avatar` (file, optional)
**Response (201 Created):**
```json
{
  "id": 2,
  "name": "New Kauch",
  "description": "...",
  "avatar_url": "...",
  "followers_count": 0,
  "created_at": "..."
}
```

### 1.3 Get Kauch Details
**Endpoint:** `GET /kauch/{kauch_id}/`
**Auth Required:** Optional/Yes
**Description:** Get details of a specific Kauch.
**Response (200 OK):** (Same as Kauch object above, plus owner details if needed).

---

## 2. Kauch Posts

### 2.1 Get Kauch Feed (Homepage Feed)
**Endpoint:** `GET /kauch/feed/`
**Auth Required:** Optional (or Yes if personalized)
**Description:** Returns a chronological feed of Kauch posts to display on the homepage.
**Response (200 OK):**
```json
[
  {
    "id": 101,
    "kauch": {
      "id": 1,
      "name": "Tech Gadgets Insider",
      "avatar_url": "https://..."
    },
    "description": "Check out these new laptops!",
    "media_type": "video", // or "image"
    "media_url": "https://example.com/video.mp4",
    "tagged_products": [
      {
        "id": 55,
        "product_name": "MacBook Pro",
        "price": "1500.00",
        "image_url": ["https://..."]
      }
    ],
    "likes_count": 45,
    "comments_count": 12,
    "is_liked_by_user": false,
    "created_at": "2026-06-04T12:00:00Z"
  }
]
```

### 2.2 Get Posts for a Specific Kauch
**Endpoint:** `GET /kauch/{kauch_id}/posts/`
**Description:** Returns posts specifically for viewing a Kauch's page.
**Response:** Same array format as `2.1`.

### 2.3 Create a Kauch Post
**Endpoint:** `POST /kauch/{kauch_id}/posts/`
**Auth Required:** Yes (Must be owner of the Kauch)
**Request Payload (multipart/form-data):**
- `description` (string)
- `media` (file)
- `tagged_product_ids` (string or array of integers, e.g., `[55, 56]`)
**Response (201 Created):** Returns the created Post object (same as `2.1` item).

---

## 3. Social Interactions

### 3.1 Like / Unlike a Post
**Endpoint:** `POST /kauch/posts/{post_id}/like/`
**Auth Required:** Yes
**Description:** Toggles the like status for the user on this post.
**Response (200 OK):**
```json
{
  "liked": true,
  "likes_count": 46
}
```

### 3.2 Comment on a Post
**Endpoint:** `POST /kauch/posts/{post_id}/comments/`
**Auth Required:** Yes
**Request JSON:**
```json
{
  "text": "This is amazing!"
}
```
**Response (201 Created):**
```json
{
  "id": 500,
  "user": {
    "id": 10,
    "username": "buyer123",
    "avatar_url": "..."
  },
  "text": "This is amazing!",
  "created_at": "..."
}
```

### 3.3 List Comments for a Post
**Endpoint:** `GET /kauch/posts/{post_id}/comments/`
**Response (200 OK):** Array of comment objects (same as `3.2` response).

# Kauchy — System Design

Kauchy is a full-stack campus marketplace that combines **e-commerce** (listings, cart,
escrow payments, in-person QR fulfillment) with **social commerce** (vendor "Kauch"
channels, follows, likes, comments) and a **personalized feed** driven by behavioral
affinity scoring.

**Stack:** Django 5.2 + DRF + Channels · Next.js 14 / React 18 · PostgreSQL · Redis ·
Cloudinary · Paystack.

> The diagrams below are [Mermaid](https://mermaid.js.org/). They render automatically in
> GitHub, GitLab, and VS Code (with a Mermaid extension). To export to PNG/SVG:
> `npx -p @mermaid-js/mermaid-cli mmdc -i docs/system-design.md -o docs/diagrams/out.svg`

---

## 1. Architecture Overview

```mermaid
flowchart TB
  subgraph Client["Client — Vercel"]
    Next["Next.js 14 App Router<br/>React · Tailwind · AuthContext"]
  end

  subgraph Backend["Django Backend — Daphne ASGI"]
    direction TB
    HTTP["DRF HTTP layer<br/>auth · products · orders<br/>payments · kauch · feed · analytics"]
    WS["Channels WS layer<br/>chat · notifications · order updates"]
    ALGO["algorithm/scoring<br/>vendor affinity · category interest"]
    HTTP --- ALGO
  end

  subgraph Data["Data & Services"]
    PG[("PostgreSQL<br/>Supabase")]
    REDIS[("Redis<br/>channel layer")]
    CLOUD["Cloudinary<br/>media CDN"]
    PAY["Paystack<br/>payments"]
    GOOG["Google OAuth"]
  end

  Next -->|REST / HTTPS| HTTP
  Next -->|WebSocket + JWT| WS
  HTTP --> PG
  HTTP --> CLOUD
  HTTP --> PAY
  HTTP --> GOOG
  WS --> REDIS
  WS --> PG
  ALGO --> PG

  classDef svc fill:#eef,stroke:#557;
  class PG,REDIS,CLOUD,PAY,GOOG svc;
```

---

## 2. Data Model (core entities)

```mermaid
erDiagram
  CustomUserModel ||--o{ Product : "sells"
  CustomUserModel ||--o{ Order : "buys / sells"
  CustomUserModel ||--o{ KauchModel : "owns"
  CustomUserModel ||--|| BuyerWallet : "has"
  CustomUserModel ||--|| VendorWallet : "has"
  CustomUserModel ||--o{ UserVendorAffinity : "scores"

  Product ||--o{ OrderItem : "in"
  Order ||--o{ OrderItem : "contains"
  Order ||--|| EscrowWallet : "held by"

  KauchModel ||--o{ PostModel : "publishes"
  PostModel ||--o{ PostLike : "receives"
  PostModel ||--o{ PostComment : "receives"
  PostModel }o--o{ Product : "tags"

  ConversationModel ||--o{ MessageModel : "has"
  BuyerWallet ||--o{ Transaction : "records"
  VendorWallet ||--o{ Transaction : "records"

  CustomUserModel {
    int id PK
    string email UK
    string role "vendor | buyer"
    bool profile_completed
  }
  Product {
    int id PK
    decimal price
    int quantity
    int likes_count "denormalized"
  }
  Order {
    string id PK "ORD-xxxxx"
    string status
    uuid qr_code
    bool qr_scanned
  }
  EscrowWallet {
    decimal amount
    string status "HELD | RELEASED | REFUNDED"
  }
  UserVendorAffinity {
    int score "raised on likes, floored at 0"
  }
```

---

## 3. Escrow + Order Fulfillment Flow

```mermaid
sequenceDiagram
  actor Buyer
  participant FE as Next.js
  participant API as Django API
  participant PAY as Paystack
  participant ESC as EscrowWallet
  actor Vendor

  Buyer->>FE: Checkout cart
  FE->>API: POST /payment/create-order/
  API->>PAY: Initialize transaction
  PAY-->>API: Auth URL
  API->>ESC: Create escrow (HELD)
  API-->>FE: Auth URL
  FE-->>Buyer: Redirect to Paystack
  Buyer->>PAY: Complete payment
  PAY-->>API: Webhook: success
  API->>API: Order = accepted, generate QR

  Note over Buyer,Vendor: In-person handoff on campus
  Vendor->>API: POST /orders/validate_order_qr/ (scan)
  API->>API: Mark qr_scanned, Order = completed
  API->>ESC: Release (RELEASED)
  ESC->>Vendor: Credit VendorWallet
  API-->>Vendor: WS order update
  API-->>Buyer: WS order update
```

---

## 4. Authentication Flow (JWT + Google OAuth)

```mermaid
sequenceDiagram
  actor User
  participant FE as Next.js
  participant API as Django API
  participant G as Google

  alt Email / password
    User->>FE: Submit credentials
    FE->>API: POST /auth/jwt/create/
    API-->>FE: access + refresh JWT
  else Google OAuth
    User->>FE: Click Google sign-in
    FE->>G: OAuth popup
    G-->>FE: ID token
    FE->>API: POST /auth/google/ (id_token)
    API->>G: Verify token
    API->>API: get_or_create user
    alt profile_completed = false
      API-->>FE: JWT + needs profile
      FE-->>User: Redirect /signup (complete profile)
      User->>API: PUT /auth/complete-profile/
    else complete
      API-->>FE: JWT
    end
  end
  Note over FE: Store JWT, attach Bearer header
```

---

## 5. Personalized Feed Ranking

```mermaid
flowchart LR
  A["User action:<br/>like product / Kauch post"] --> B["add_vendor_affinity()"]
  B --> C[("UserVendorAffinity<br/>score += 1, floor 0")]
  A2["User views category"] --> D[("UserCategoryModel<br/>view_count")]

  E["GET /customers/feed/"] --> F["FeedView"]
  C --> F
  D --> F
  G[("Products + Kauch posts")] --> F
  F --> H["Rank: affinity × category × recency × engagement"]
  H --> I["Swiper feed (virtualized)"]
```

---

## 6. Key Design Decisions & Tradeoffs

| Decision | Rationale | Tradeoff |
|---|---|---|
| Escrow-based payments | Trust between unknown campus peers | More order state; needs release logic |
| QR in-person fulfillment | Campus commerce is local/physical | No remote shipping flow |
| Like-based affinity (not views) | Higher-signal personalization | Cold-start for new users |
| Denormalized counters | Fast feed/card reads | Sync risk if model overrides missed |
| Channels + Redis | Real-time chat/notifications | Redis becomes a hard dependency |

---

## 7. Production Hardening Checklist

- [ ] `DEBUG = False`; restrict `ALLOWED_HOSTS` and CORS (currently permissive)
- [ ] Shorten JWT lifetimes (currently ~123 days); move tokens to secure cookies, not `localStorage`
- [ ] Add DRF rate-limiting / throttling
- [ ] Validate media uploads (type, size) at the boundary
- [ ] Ensure no secrets are committed; rotate any tracked `.env` values
- [ ] Enforce HTTPS + HSTS

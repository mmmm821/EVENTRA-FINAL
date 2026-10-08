# EVENTRA — Event Discovery & Ticket Booking Platform

A full-stack event discovery and ticket booking platform — think **District** or
**BookMyShow**, purpose-built for college and community events. Discover events,
book tickets, pay securely, and get a signed, QR-coded digital ticket. Organizers
get an event-creation wizard and a live sales dashboard; admins get moderation,
user management and platform-wide transaction oversight.

Design language: **neo-brutalist** — bold black borders, hard offset shadows,
a bright yellow/pink/cyan/green palette, and no gradients or blur.

## Project structure

```
eventra/
├── backend/                  Node.js + Express REST API
│   ├── server.js             App entry point — wires routes & serves the frontend
│   ├── controllers/          Request handlers (one file per resource)
│   ├── routes/                Express routers (one file per resource)
│   ├── middleware/auth.js    JWT verification + role-based access guard
│   ├── utils/
│   │   ├── db.js             JSON-file "database" (read/write/seed)
│   │   ├── jwt.js            Auth token sign/verify
│   │   └── qr.js             Signed ticket token + QR code generation
│   └── data/db.json          The database file itself (auto-seeded on first run)
│
└── frontend/                 Static HTML/CSS/JS — no build step required
    ├── index.html            Home / event discovery
    ├── login.html / register.html
    ├── event-details.html    Ticket selection
    ├── booking.html          4-step booking flow + payment + confirmation
    ├── my-tickets.html       QR ticket wallet
    ├── favorites.html
    ├── qr-checkin.html       Organizer/admin scan & verify screen
    ├── organizer-dashboard.html
    ├── admin-dashboard.html
    ├── css/style.css         Neo-brutalist design system
    └── js/                   One script per page + shared helpers (api, auth, nav, utils)
```

Frontend and backend are two clearly separated codebases in one project folder —
the backend also serves the frontend's static files, so the whole app runs from
a single command.

## Getting started

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Open **http://localhost:5000** in your browser. The backend serves every frontend page from the same origin. That's it — no database server,
no build step. The JSON-file "database" seeds itself automatically on first run
with demo accounts:

| Role      | Email                  | Password    |
|-----------|-------------------------|-------------|
| Attendee  | attendee@eventra.dev    | password123 |
| Organizer | organizer@eventra.dev   | password123 |
| Admin     | admin@eventra.dev       | password123 |

For local frontend iteration you can also run the `frontend/` folder with any
static file server (e.g. `npx serve frontend`) — just point `frontend/js/config.js`
at your backend's URL if it's not on the same origin.

## User roles & flows

- **Attendee** — discover & filter events, favorite events, select ticket types,
  book & pay (Razorpay test-mode simulation), receive a signed QR digital ticket,
  view/download tickets from "My Tickets".
- **Organizer** — guided event-creation form (submits for admin approval), live
  dashboard (events, tickets sold, revenue, QR check-ins), recent events table.
- **Admin** — approve/reject submitted events, suspend/reinstate users, monitor
  all confirmed transactions, platform-wide statistics.
- **QR Check-in** (organizer & admin) — scan or type a ticket ID/QR value to
  verify and check attendees in; duplicate check-ins are rejected.

## API overview

All endpoints are under `/api`. Protected routes require `Authorization: Bearer <token>`.

| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create an attendee or organizer account |
| POST | `/auth/login` | Public | Log in, returns a JWT |
| GET | `/auth/me` | Auth | Current user |
| GET | `/events` | Public | Search/filter/sort/paginate approved events |
| GET | `/events/:id` | Public | Event details incl. ticket types & seats left |
| POST | `/events` | Organizer | Create event (goes to `pending` for approval) |
| PUT | `/events/:id` | Organizer (own) | Edit event |
| PATCH | `/events/:id/cancel` | Organizer (own) | Cancel event |
| PATCH | `/events/:id/favorite` | Attendee | Toggle favorite |
| GET | `/events/favorites/mine` | Attendee | List favorited events |
| POST | `/bookings` | Attendee | Create booking, holds seat inventory |
| POST | `/bookings/:id/pay` | Attendee | Verify payment, issue signed QR tickets |
| PATCH | `/bookings/:id/cancel` | Attendee | Cancel an unpaid booking, releases seats |
| GET | `/bookings/mine` | Attendee | My bookings |
| GET | `/tickets/mine` | Attendee | My tickets (with QR data URLs) |
| POST | `/tickets/verify` | Organizer/Admin | Verify & check in a ticket |
| GET | `/organizer/dashboard` | Organizer | Stats: events, tickets sold, revenue, check-ins |
| GET | `/organizer/events` | Organizer | My events |
| GET | `/admin/stats` | Admin | Platform-wide statistics |
| GET | `/admin/events` | Admin | All events (filter by `?status=`) |
| PATCH | `/admin/events/:id/status` | Admin | Approve / reject / cancel an event |
| GET | `/admin/users` | Admin | All users |
| PATCH | `/admin/users/:id/suspend` | Admin | Suspend / reinstate a user |
| GET | `/admin/transactions` | Admin | All confirmed transactions |

## Notes on scope & upgrade path

This build favors **zero external services** so it runs immediately with `npm install`:

- **Database:** a JSON file (`backend/data/db.json`) stands in for PostgreSQL.
  Every controller only calls `readDB()`/`writeDB()`, so swapping in Prisma +
  PostgreSQL means rewriting `backend/utils/db.js` — no controller changes.
- **Payments:** `/bookings/:id/pay` simulates a verified Razorpay test-mode
  payment. To go live, integrate Razorpay Checkout on the frontend and verify
  `razorpay_order_id` / `razorpay_payment_id` / `razorpay_signature` with
  `crypto.createHmac` server-side before marking a booking confirmed.
  Inventory holding, ticket issuance and QR signing already work exactly as
  they would in production.
  - **QR tickets:** each ticket is a JWT-signed token rendered as a QR code
    (`backend/utils/qr.js`) — tamper-proof and single-use (checked-in state is
    tracked per ticket).
  - **Auth:** JWT + bcrypt, role-based middleware (`attendee` / `organizer` /
    `admin`). NextAuth/Google OAuth can be layered in later without changing
    the JWT contract the frontend already expects.
  - **Media storage (event images):** currently a plain image URL field —
    swap in Cloudinary upload handling in `events.controller.js` `create()`/`update()`.


## Quick run

### Windows PowerShell
```powershell
cd backend
npm install
Copy-Item .env.example .env
npm start
```
Then open `http://localhost:5000`.

### Demo accounts
- Attendee: `attendee@eventra.dev` / `password123`
- Organizer: `organizer@eventra.dev` / `password123`
- Admin: `admin@eventra.dev` / `password123`

The project is intentionally dependency-light: Express serves the static frontend and JSON storage is used for the demo database. For production, replace JSON storage and simulated payments with PostgreSQL and Razorpay/another payment provider.

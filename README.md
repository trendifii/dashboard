# Trendifii Admin Dashboard

A lightweight, single-page admin dashboard for the **Trendifii** influencer marketing platform. Built with vanilla JavaScript, Tailwind CSS (CDN), Chart.js, and Font Awesome — no build step required.

## Features

- **Overview** — At-a-glance stats (total campaigns, posts, budget allocated, average post score), campaign status doughnut chart, and recent activity feed.
- **Campaign Management** — Browse, filter (All / Active / Draft / Completed), and create campaigns with budget, category, date range, and brand image.
- **Posts & Scoring** — Paginated post grid with per-post engagement metrics (views, likes, comments), score status, and one-click AI scoring trigger.
- **Analytics & Reports** — Engagement bar chart (top 10 posts), platform distribution pie chart, and a performance metrics summary table.
- **Settings** — Delete admin account.

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | Tailwind CSS v3 (CDN / JIT) |
| Charts | Chart.js (CDN) |
| Icons | Font Awesome 6 |
| Logic | Vanilla JavaScript (ES2020) |
| Backend | Trendifii REST API (`https://trendify-kjsm.onrender.com`) |

## Project Structure

```
trendifii_dashboard/
├── index.html   # All markup — login, register, OTP, dashboard sections, modals
└── script.js    # All logic — auth, API calls, rendering, chart initialisation
```

## Getting Started

No installation or build step needed. Open `index.html` directly in a browser or serve it with any static file server:

```bash
# Python
python3 -m http.server 8080

# Node (npx)
npx serve .
```

Then navigate to `http://localhost:8080`.

## Authentication

The dashboard uses **Bearer token** authentication against the Trendifii admin API.

1. Register an admin account (first-time only) — an OTP is sent to your email for verification.
2. Log in with your email and password.
3. The access token is stored in `localStorage` and attached to every subsequent API request.
4. Logging out clears the token and reloads the page.

## API Endpoints Used

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/admin/login` | Admin login |
| POST | `/api/v1/admin/register` | Admin registration |
| POST | `/api/v1/admin/verify-otp` | OTP verification |
| POST | `/api/v1/admin/resend-otp` | Resend OTP |
| GET | `/api/v1/admin/campaigns` | List campaigns |
| POST | `/api/v1/admin/campaigns` | Create campaign |
| GET | `/api/v1/admin/posts` | List posts (paginated) |
| POST | `/api/v1/admin/posts/score` | Trigger post scoring |
| DELETE | `/api/v1/admin/delete` | Delete admin account |

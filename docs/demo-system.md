# Demo System

Four HTML pages in `demo/public/` served by `demo/server.ts` (Express on ports 3000 + 3001).

## Starting

```bash
npm run demo    # starts both servers
npm run dev     # starts Vite watch + demo servers
```

## Pages

**Port 3000 (external systems):**
- `hotel-portal.html` — 3-step booking form (`#hotel-location`, `#btn-hotel-search`, `#btn-book-crowne`, `#booking-guest-name`, `#booking-guest-email`, `#booking-guest-phone`, `#btn-confirm-booking`)

**Port 3001 (SilverOS internal systems):**
- `flight-schedule.html` — read-only ops board, SQ321 delayed row
- `passenger-manifest.html` — has `data-waypoint-field` attributes: `passenger-name`, `passenger-tier`, `passenger-email`, `passenger-phone`, `passenger-recovery-status`, `passenger-connection`
- `crm-email.html` — email compose (`#crm-email-to`, `#crm-email-subject`, `#crm-email-body`, `#btn-crm-send`)

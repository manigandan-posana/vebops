
# Vebops Frontend (React + Vite + Tailwind + Redux Toolkit + RTK Query)

This app uses your provided Redux APIs and slices. It wires them into a full UI across Admin, Back Office, FE, and Customer roles with single-login flow (email + password only).

## Quick Start

```bash
# 1) Install
npm i

# 2) Configure backend base URL
cp .env.example .env
# edit VITE_API_BASE_URL to point at your backend

# 3) Run
npm run dev
```

## Login

- Use the seeded admin:
  - Email: `admin@vebops.com`
  - Password: `vebops`

The backend is expected to return JWT + user object with `role` and `tenantId`. The app reads `role` to redirect:

- ADMIN → `/admin/dashboard`
- BACK_OFFICE/OFFICE → `/office/dashboard`
- FE → `/fe/assigned`
- CUSTOMER → `/customer/proposals`

If `user.subscriptionActive === false`, access is locked with a banner.

## Notes

- All API calls are made through your `baseApi` and feature APIs (`adminApi`, `officeApi`, `feApi`, `customerApi`). The Authorization header uses your Redux auth slice and localStorage.
- Tenant scoping: the backend should apply Row-Level Security; pass any required `tenantId` in your endpoints. If you want a header like `X-Tenant-ID`, add it inside `src/api/baseApi.js -> prepareHeaders`.
- Forms use `react-hook-form` + `zod` where helpful; basic validations are included.
- File downloads (invoices, completion report) use `utils/file.downloadBlob`.
- Intake flow: selecting a kit in Service Intake auto-creates a **Draft Proposal** instead of directly creating SR/WO. Approval/PO upload leads to WO auto-creation per your API.

## Structure
- `src/app/store.js` — Redux store (from your zip)
- `src/features/*` — Your RTK Query APIs and slices (from your zip)
- `src/views/*` — New pages
- `src/shell/*` — Layouts, protected-route, nav


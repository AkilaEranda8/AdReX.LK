# AdReX.LK — Invoice & Quotation Management

A modern, full-stack management system built with Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, AG Grid, Prisma, and SQLite.

## Features

- **Authentication** - Secure login with JWT, remember me, forgot password, role-based access (Admin/Staff)
- **Dashboard** - Overview cards for clients, invoices, quotations, and customer credit
- **Client Management** - CRUD with auto-generated IDs (CLI-000001)
- **Invoice Management** - Multi-item invoices with discount, advance payment, PDF export/print
- **Quotation Management** - Create, edit, convert to invoice, PDF export
- **Customer Credit** - Track outstanding balances and record payments
- **AG Grid Tables** - Search, sort, filter, pagination, CSV/Excel export

## Getting Started

```bash
npm install --cache .npm-cache
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Credentials

| Role  | Email            | Password  |
|-------|------------------|-----------|
| Admin | admin@adrexlk.com | admin123  |
| Staff | staff@adrexlk.com | staff123  |

# 📦 Stockify — Inventory Management System

Sistem manajemen inventori modern yang dibangun dengan Next.js 14, Prisma, dan NextAuth.

## 🚀 Fitur

### Core Features
- ✅ **Real-time Stock Tracking** — Stok update otomatis setiap transaksi
- ✅ **Barcode & QR Code Scanning** — Scan via mobile browser
- ✅ **Multi-Location / Multi-Gudang** — Kelola banyak gudang + transfer antar lokasi
- ✅ **Item Master Data** — SKU, barcode, kategori, satuan, harga beli/jual
- ✅ **Stock In / Stock Out** — Pencatatan masuk (PO) & keluar (SO)
- ✅ **Low Stock Alert** — Notifikasi otomatis stok mendekati reorder point
- ✅ **Role-based Access** — Admin, Manager, Staff, Viewer
- ✅ **Audit Trail** — Log semua aktivitas pengguna

### Fitur Operasional
- ✅ **Purchase Order (PO)** — Buat PO ke supplier, terima barang, update stok otomatis
- ✅ **Sales Order (SO)** — Penjualan, stok otomatis berkurang
- ✅ **Stock Opname** — Hitung fisik stok + adjustment otomatis
- ✅ **Serial Number & Batch Tracking** — Untuk barang elektronik, makanan, obat
- ✅ **Laporan & Analytics** — Nilai stok, transaksi, penjualan, stok rendah, audit log
- ✅ **Export Data** — Ekspor data tabel dan laporan ke format CSV / Excel
- ✅ **PWA-ready** — Bisa diakses penuh dari HP

## 🛠️ Tech Stack

| Teknologi | Versi | Kegunaan |
|-----------|-------|---------|
| Next.js | 16.x | Full-stack framework |
| TypeScript | 5.x | Type safety |
| Prisma | 6.x | ORM + Database |
| SQLite | - | Database (dev) |
| NextAuth.js | 4.x | Authentication |
| Tailwind CSS | 4.x | Styling |
| TanStack Query | 5.x | Data fetching |
| Recharts | 2.x | Charts & analytics |
| Sonner | 1.x | Toast notifications |
| Zod | 3.x | Validation |

## 📋 Prerequisites

- Node.js 18+
- npm / yarn / pnpm

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup database
npm run db:push

# 3. Seed data demo
npm run db:seed       # Data demo (50 item)
# Atau untuk volume besar:
# npm run db:seed:10k  # 10.000 item
# npm run db:seed:100k # 100.000 item

# 4. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## 🔑 Akun Demo

| Role | Email | Password |
|------|-------|---------|
| Admin | admin@stockify.com | admin123 |
| Manager | manager@stockify.com | manager123 |
| Staff | staff@stockify.com | staff123 |

## 🗄️ Database

Menggunakan SQLite untuk development. Untuk production, ganti ke PostgreSQL:

```env
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/stockify"
```

Kemudian update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## 📁 Struktur Project

```
stockify/
├── app/
│   ├── (auth)/          # Login page
│   ├── (dashboard)/     # Semua halaman utama
│   │   ├── dashboard/   # Dashboard overview
│   │   ├── items/       # Master barang
│   │   ├── inventory/   # Stock levels
│   │   ├── purchase-orders/ # PO management
│   │   ├── sales-orders/    # SO management
│   │   ├── stock-opname/    # Stock count
│   │   ├── reports/         # Analytics
│   │   ├── locations/       # Gudang/toko
│   │   ├── suppliers/       # Supplier
│   │   ├── customers/       # Customer
│   │   ├── users/           # User management
│   │   └── settings/        # Profile settings
│   └── api/             # REST API routes
├── components/
│   ├── ui/              # Reusable UI components
│   └── layout/          # Sidebar, Header
├── lib/                 # Utilities, auth, prisma
├── prisma/              # Schema + seed
└── types/               # TypeScript types
```

## 🔒 Role & Permission

| Permission | Admin | Manager | Staff | Viewer |
|-----------|-------|---------|-------|--------|
| Semua | ✅ | - | - | - |
| Buat/Edit Barang | ✅ | ✅ | ✅ | - |
| Lihat Barang | ✅ | ✅ | ✅ | ✅ |
| Kelola PO/SO | ✅ | ✅ | ✅ | - |
| Stock Opname | ✅ | ✅ | ✅ | - |
| Laporan | ✅ | ✅ | - | ✅ |
| Kelola Lokasi | ✅ | ✅ | - | - |
| Kelola User | ✅ | - | - | - |

## 🚢 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Set environment variables di Vercel dashboard:
- `DATABASE_URL` (PostgreSQL connection string)
- `NEXTAUTH_SECRET` (random string, min 32 chars)
- `NEXTAUTH_URL` (production URL)

## 📝 Scripts

```bash
npm run dev          # Development server
npm run build        # Build production
npm run start        # Start production server
npm run db:push      # Sync Prisma schema ke database
npm run db:studio    # Buka Prisma Studio (DB GUI)
npm run db:seed      # Seed data demo (50 item)
npm run db:seed:10k  # Seed 10.000 item (skala besar)
npm run db:seed:100k # Seed 100.000 item (skala besar)
npm run db:generate  # Generate Prisma client
```

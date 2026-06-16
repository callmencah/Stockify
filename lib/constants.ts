export const TRANSACTION_TYPES = {
  PURCHASE: { label: "Pembelian", color: "blue" },
  SALE: { label: "Penjualan", color: "green" },
  TRANSFER_IN: { label: "Transfer Masuk", color: "cyan" },
  TRANSFER_OUT: { label: "Transfer Keluar", color: "orange" },
  ADJUSTMENT: { label: "Penyesuaian", color: "purple" },
  RETURN_IN: { label: "Retur Masuk", color: "teal" },
  RETURN_OUT: { label: "Retur Keluar", color: "yellow" },
  OPNAME: { label: "Stock Opname", color: "gray" },
} as const;

export const PO_STATUS = {
  DRAFT: { label: "Draft", variant: "secondary" },
  SENT: { label: "Dikirim", variant: "default" },
  PARTIAL: { label: "Sebagian Diterima", variant: "warning" },
  RECEIVED: { label: "Diterima", variant: "success" },
  CANCELLED: { label: "Dibatalkan", variant: "destructive" },
} as const;

export const SO_STATUS = {
  DRAFT: { label: "Draft", variant: "secondary" },
  CONFIRMED: { label: "Dikonfirmasi", variant: "default" },
  SHIPPED: { label: "Dikirim", variant: "warning" },
  DELIVERED: { label: "Selesai", variant: "success" },
  CANCELLED: { label: "Dibatalkan", variant: "destructive" },
} as const;

export const OPNAME_STATUS = {
  DRAFT: { label: "Draft", variant: "secondary" },
  IN_PROGRESS: { label: "Sedang Berjalan", variant: "warning" },
  COMPLETED: { label: "Selesai", variant: "success" },
  CANCELLED: { label: "Dibatalkan", variant: "destructive" },
} as const;

export const ROLES = {
  ADMIN: { label: "Administrator", color: "red" },
  MANAGER: { label: "Manager", color: "blue" },
  STAFF: { label: "Staff", color: "green" },
  VIEWER: { label: "Viewer", color: "gray" },
} as const;

export const LOCATION_TYPES = {
  WAREHOUSE: { label: "Gudang", icon: "Warehouse" },
  STORE: { label: "Toko", icon: "Store" },
  SUPPLIER: { label: "Supplier", icon: "Truck" },
  CUSTOMER: { label: "Customer", icon: "Users" },
} as const;

export const SERIAL_STATUS = {
  AVAILABLE: { label: "Tersedia", color: "green" },
  SOLD: { label: "Terjual", color: "blue" },
  DEFECTIVE: { label: "Rusak", color: "red" },
  RETURNED: { label: "Diretur", color: "orange" },
} as const;

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  avatar?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  type: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  parent?: Category | null;
  children?: Category[];
}

export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
}

export interface Item {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  photo?: string | null;
  buyPrice: number;
  sellPrice: number;
  minStock: number;
  reorderPoint: number;
  categoryId?: string | null;
  unitId?: string | null;
  isActive: boolean;
  trackSerial: boolean;
  trackBatch: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: Category | null;
  unit?: Unit | null;
  itemLocations?: ItemLocation[];
}

export interface ItemLocation {
  id: string;
  itemId: string;
  locationId: string;
  quantity: number;
  item?: Item;
  location?: Location;
}

export interface StockTransaction {
  id: string;
  type: string;
  itemId: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  quantity: number;
  unitCost?: number | null;
  reference?: string | null;
  notes?: string | null;
  userId: string;
  createdAt: Date;
  item?: Item;
  fromLocation?: Location | null;
  toLocation?: Location | null;
  user?: User;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId?: string | null;
  locationId: string;
  status: string;
  orderDate: Date;
  expectedDate?: Date | null;
  notes?: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  supplier?: Supplier | null;
  location?: Location;
  user?: User;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  itemId: string;
  quantity: number;
  receivedQty: number;
  unitCost: number;
  notes?: string | null;
  item?: Item;
}

export interface SalesOrder {
  id: string;
  number: string;
  customerId?: string | null;
  locationId: string;
  status: string;
  orderDate: Date;
  notes?: string | null;
  discount: number;
  tax: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  customer?: Customer | null;
  location?: Location;
  user?: User;
  items?: SalesOrderItem[];
}

export interface SalesOrderItem {
  id: string;
  salesOrderId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  notes?: string | null;
  item?: Item;
}

export interface StockOpname {
  id: string;
  number: string;
  locationId: string;
  status: string;
  startDate: Date;
  endDate?: Date | null;
  notes?: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  location?: Location;
  user?: User;
  items?: StockOpnameItem[];
}

export interface StockOpnameItem {
  id: string;
  stockOpnameId: string;
  itemId: string;
  systemQty: number;
  physicalQty?: number | null;
  difference?: number | null;
  notes?: string | null;
  item?: Item;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityId?: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  user?: User;
}

export interface DashboardStats {
  totalItems: number;
  totalLocations: number;
  totalStockValue: number;
  lowStockItems: number;
  pendingPOs: number;
  pendingSOs: number;
  todayTransactions: number;
  unreadNotifications: number;
}

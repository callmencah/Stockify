import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@stockify.com" },
    update: {},
    create: {
      name: "Admin Stockify",
      email: "admin@stockify.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  // Create manager
  const managerPassword = await bcrypt.hash("manager123", 12);
  await prisma.user.upsert({
    where: { email: "manager@stockify.com" },
    update: {},
    create: {
      name: "Manager",
      email: "manager@stockify.com",
      password: managerPassword,
      role: "MANAGER",
    },
  });

  // Create staff
  const staffPassword = await bcrypt.hash("staff123", 12);
  await prisma.user.upsert({
    where: { email: "staff@stockify.com" },
    update: {},
    create: {
      name: "Staff Gudang",
      email: "staff@stockify.com",
      password: staffPassword,
      role: "STAFF",
    },
  });

  // Locations
  const mainWarehouse = await prisma.location.upsert({
    where: { code: "GDG-01" },
    update: {},
    create: {
      code: "GDG-01",
      name: "Gudang Utama",
      address: "Jl. Industri No. 1, Jakarta",
      type: "WAREHOUSE",
    },
  });

  const store1 = await prisma.location.upsert({
    where: { code: "TKO-01" },
    update: {},
    create: {
      code: "TKO-01",
      name: "Toko Cabang Jakarta",
      address: "Jl. Raya Orchard No. 5, Jakarta Selatan",
      type: "STORE",
    },
  });

  await prisma.location.upsert({
    where: { code: "TKO-02" },
    update: {},
    create: {
      code: "TKO-02",
      name: "Toko Cabang Surabaya",
      address: "Jl. Pemuda No. 10, Surabaya",
      type: "STORE",
    },
  });

  // Categories
  const electronics = await prisma.category.upsert({
    where: { id: "cat-electronics" },
    update: {},
    create: {
      id: "cat-electronics",
      name: "Elektronik",
      description: "Produk elektronik dan gadget",
    },
  });

  const clothing = await prisma.category.upsert({
    where: { id: "cat-clothing" },
    update: {},
    create: {
      id: "cat-clothing",
      name: "Pakaian",
      description: "Produk fashion dan pakaian",
    },
  });

  await prisma.category.upsert({
    where: { id: "cat-food" },
    update: {},
    create: {
      id: "cat-food",
      name: "Makanan & Minuman",
      description: "Produk F&B",
    },
  });

  // Units
  const pcs = await prisma.unit.upsert({
    where: { id: "unit-pcs" },
    update: {},
    create: {
      id: "unit-pcs",
      name: "Pieces",
      abbreviation: "pcs",
    },
  });

  await prisma.unit.upsert({
    where: { id: "unit-box" },
    update: {},
    create: {
      id: "unit-box",
      name: "Box",
      abbreviation: "box",
    },
  });

  await prisma.unit.upsert({
    where: { id: "unit-kg" },
    update: {},
    create: {
      id: "unit-kg",
      name: "Kilogram",
      abbreviation: "kg",
    },
  });

  // Suppliers
  const supplier1 = await prisma.supplier.upsert({
    where: { code: "SUP-001" },
    update: {},
    create: {
      code: "SUP-001",
      name: "PT. Teknologi Maju",
      contact: "Budi Santoso",
      email: "budi@teknologimaju.com",
      phone: "021-1234567",
      address: "Jl. Teknologi No. 1, Jakarta",
    },
  });

  // Customers
  await prisma.customer.upsert({
    where: { code: "CUS-001" },
    update: {},
    create: {
      code: "CUS-001",
      name: "PT. Retail Indonesia",
      contact: "Sari Dewi",
      email: "sari@retailindo.com",
      phone: "021-9876543",
      address: "Jl. Bisnis No. 5, Jakarta",
    },
  });

  // Items
  const laptop = await prisma.item.upsert({
    where: { sku: "ELEC-LAP-001" },
    update: {},
    create: {
      sku: "ELEC-LAP-001",
      barcode: "8901234567890",
      name: "Laptop Gaming ProX 15",
      description: "Laptop gaming dengan prosesor terbaru, RAM 16GB, SSD 512GB",
      buyPrice: 12000000,
      sellPrice: 15000000,
      minStock: 5,
      reorderPoint: 10,
      categoryId: electronics.id,
      unitId: pcs.id,
      trackSerial: true,
    },
  });

  const phone = await prisma.item.upsert({
    where: { sku: "ELEC-PHN-001" },
    update: {},
    create: {
      sku: "ELEC-PHN-001",
      barcode: "8901234567891",
      name: "Smartphone UltraMax X",
      description: "Smartphone flagship dengan kamera 108MP",
      buyPrice: 6000000,
      sellPrice: 8000000,
      minStock: 10,
      reorderPoint: 20,
      categoryId: electronics.id,
      unitId: pcs.id,
      trackSerial: true,
    },
  });

  const tshirt = await prisma.item.upsert({
    where: { sku: "CLO-TSH-001" },
    update: {},
    create: {
      sku: "CLO-TSH-001",
      barcode: "8901234567892",
      name: "Kaos Basic Premium",
      description: "Kaos basic berbahan katun combed 30s",
      buyPrice: 50000,
      sellPrice: 89000,
      minStock: 20,
      reorderPoint: 50,
      categoryId: clothing.id,
      unitId: pcs.id,
    },
  });

  // Item Locations (Initial Stock)
  const itemsToStock = [
    { itemId: laptop.id, locationId: mainWarehouse.id, quantity: 25 },
    { itemId: laptop.id, locationId: store1.id, quantity: 5 },
    { itemId: phone.id, locationId: mainWarehouse.id, quantity: 50 },
    { itemId: phone.id, locationId: store1.id, quantity: 15 },
    { itemId: tshirt.id, locationId: mainWarehouse.id, quantity: 200 },
    { itemId: tshirt.id, locationId: store1.id, quantity: 45 },
  ];

  for (const stock of itemsToStock) {
    await prisma.itemLocation.upsert({
      where: {
        itemId_locationId: {
          itemId: stock.itemId,
          locationId: stock.locationId,
        },
      },
      update: { quantity: stock.quantity },
      create: stock,
    });
  }

  // Sample Purchase Order
  await prisma.purchaseOrder.upsert({
    where: { number: "PO-2024-001" },
    update: {},
    create: {
      number: "PO-2024-001",
      supplierId: supplier1.id,
      locationId: mainWarehouse.id,
      status: "RECEIVED",
      userId: admin.id,
      notes: "Order pertama",
      items: {
        create: [
          {
            itemId: laptop.id,
            quantity: 25,
            receivedQty: 25,
            unitCost: 12000000,
          },
          {
            itemId: phone.id,
            quantity: 50,
            receivedQty: 50,
            unitCost: 6000000,
          },
        ],
      },
    },
  });

  // Sample notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        type: "LOW_STOCK",
        title: "Stok Rendah",
        message: "Laptop Gaming ProX 15 di Toko Cabang Jakarta hampir habis (5 pcs tersisa)",
        entityId: laptop.id,
        isRead: false,
      },
      {
        userId: admin.id,
        type: "PO_RECEIVED",
        title: "PO Diterima",
        message: "Purchase Order PO-2024-001 telah diterima sepenuhnya",
        entityId: "PO-2024-001",
        isRead: true,
      },
    ],
  });

  console.log("✅ Seeding completed!");
  console.log("👤 Admin: admin@stockify.com / admin123");
  console.log("👤 Manager: manager@stockify.com / manager123");
  console.log("👤 Staff: staff@stockify.com / staff123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

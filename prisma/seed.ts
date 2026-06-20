import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function chunkedCreateMany<T>(
  model: { createMany: (args: { data: T[]; skipDuplicates?: boolean }) => Promise<unknown> },
  data: T[],
  chunkSize = 2000
) {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await model.createMany({ data: chunk, skipDuplicates: true });
  }
}

async function main() {
  console.log("🌱 Seeding database...");

  // Parse arguments
  const args = process.argv.slice(2);
  const itemsArg = args.find(arg => arg.startsWith("--items="));
  const numItems = itemsArg ? parseInt(itemsArg.split("=")[1], 10) : 50;
  console.log(`📦 Target items to seed: ${numItems}`);

  // 1. Clear database sequentially (to handle foreign keys safely)
  console.log("🧹 Cleaning up existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.serialNumber.deleteMany();
  await prisma.batch.deleteMany();
  
  await prisma.stockOpnameItem.deleteMany();
  await prisma.stockOpname.deleteMany();
  
  await prisma.stockAdjustmentItem.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  
  await prisma.itemLocation.deleteMany();
  await prisma.location.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  console.log("🧹 Database cleared.");

  // 2. Create Default Users
  console.log("👥 Creating users...");
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.create({
    data: {
      name: "Admin Stockify",
      email: "admin@stockify.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  const managerPassword = await bcrypt.hash("manager123", 12);
  await prisma.user.create({
    data: {
      name: "Manager",
      email: "manager@stockify.com",
      password: managerPassword,
      role: "MANAGER",
    },
  });

  const staffPassword = await bcrypt.hash("staff123", 12);
  await prisma.user.create({
    data: {
      name: "Staff Gudang",
      email: "staff@stockify.com",
      password: staffPassword,
      role: "STAFF",
    },
  });

  // 3. Create Locations
  console.log("📍 Creating locations...");
  const locationData = [
    { code: "GDG-01", name: "Gudang Utama", address: "Jl. Industri No. 1, Jakarta", type: "WAREHOUSE" },
    { code: "TKO-01", name: "Toko Cabang Jakarta", address: "Jl. Raya Orchard No. 5, Jakarta Selatan", type: "STORE" },
    { code: "TKO-02", name: "Toko Cabang Surabaya", address: "Jl. Pemuda No. 10, Surabaya", type: "STORE" },
  ];
  const locations = [];
  for (const loc of locationData) {
    const created = await prisma.location.create({ data: loc });
    locations.push(created);
  }

  // 4. Create Categories
  console.log("🏷️ Creating categories...");
  const categoryData = [
    { id: "cat-electronics", name: "Elektronik", description: "Produk elektronik dan gadget" },
    { id: "cat-clothing", name: "Pakaian", description: "Produk fashion dan pakaian" },
    { id: "cat-food", name: "Makanan & Minuman", description: "Produk F&B" },
    { id: "cat-atk", name: "Alat Tulis & Kantor", description: "Buku, pena, kertas HVS" },
    { id: "cat-health", name: "Kesehatan & Farmasi", description: "Obat-obatan, masker, vitamin" },
    { id: "cat-household", name: "Peralatan Rumah Tangga", description: "Sapu, wajan, alat dapur" },
    { id: "cat-automotive", name: "Otomotif & Aksesoris", description: "Oli, busi, helm" },
    { id: "cat-sports", name: "Olahraga & Outdoor", description: "Tenda, matras, dumbbell" },
    { id: "cat-toys", name: "Mainan & Hobi", description: "Lego, rubik, puzzle" },
    { id: "cat-beauty", name: "Kecantikan & Kosmetik", description: "Serum, lipcream, bedak" },
  ];
  const categories = [];
  for (const cat of categoryData) {
    const created = await prisma.category.create({ data: cat });
    categories.push(created);
  }

  // 5. Create Units
  console.log("📏 Creating units...");
  const unitData = [
    { id: "unit-pcs", name: "Pieces", abbreviation: "pcs" },
    { id: "unit-box", name: "Box", abbreviation: "box" },
    { id: "unit-kg", name: "Kilogram", abbreviation: "kg" },
  ];
  const units = [];
  for (const unit of unitData) {
    const created = await prisma.unit.create({ data: unit });
    units.push(created);
  }

  // 6. Create Suppliers & Customers
  console.log("🤝 Creating suppliers & customers...");
  const suppliers = [];
  for (let i = 1; i <= 10; i++) {
    const created = await prisma.supplier.create({
      data: {
        code: `SUP-${String(i).padStart(3, "0")}`,
        name: `PT. Supplierindo Utama ${i}`,
        contact: `Contact Person ${i}`,
        email: `supplier${i}@supplierindo.com`,
        phone: `021-7654321${i}`,
        address: `Kawasan Industri Blok B No. ${i}, Tangerang`,
      },
    });
    suppliers.push(created);
  }

  const customers = [];
  for (let i = 1; i <= 10; i++) {
    const created = await prisma.customer.create({
      data: {
        code: `CUS-${String(i).padStart(3, "0")}`,
        name: `PT. Retailindo Jaya ${i}`,
        contact: `Customer Contact ${i}`,
        email: `retail${i}@retailindojaya.com`,
        phone: `021-8765432${i}`,
        address: `Jl. Niaga Makmur No. ${i}, Jakarta`,
      },
    });
    customers.push(created);
  }

  // 7. Generate Items
  console.log("📦 Generating item data...");
  const categoryTemplates: Record<string, { code: string; names: string[] }> = {
    "cat-electronics": {
      code: "ELK",
      names: ["Laptop Core-i5", "Smartphone 5G", "Headphone Bass", "Keyboard Mechanical", "Mouse Wireless", "Monitor IPS", "Smart TV 4K", "Powerbank 20k", "Speaker Bluetooth", "Kamera Mirrorless"]
    },
    "cat-clothing": {
      code: "PKN",
      names: ["Kaos Polo Premium", "Kemeja Flanel", "Celana Chino", "Jaket Bomber", "Kaos Kaki Katun", "Sweater Hoodie", "Celana Jeans Slim", "Jas Formal", "Topi Baseball", "Rok Pleated"]
    },
    "cat-food": {
      code: "FNB",
      names: ["Kopi Susu Aren", "Teh Kemasan Botol", "Keripik Singkong", "Roti Tawar Gandum", "Susu UHT Cream", "Air Mineral Glass", "Mie Instan Goreng", "Biskuit Cokelat", "Jus Buah Segar", "Cokelat Bar 50g"]
    },
    "cat-atk": {
      code: "ATK",
      names: ["Buku Tulis A5", "Pulpen Gel Hitam", "Pensil 2B", "Kertas HVS A4", "Map Dokumen", "Gunting Kertas", "Penggaris Besi", "Penghapus Karet", "Sticker Memo", "Spidol Papan"]
    },
    "cat-health": {
      code: "OBT",
      names: ["Masker Medis", "Hand Sanitizer", "Vitamin C 500mg", "Obat Flu Batuk", "Minyak Telon", "Plester Luka", "Termometer", "Suplemen Kalsium", "Kasa Steril", "Minyak Kayu Putih"]
    },
    "cat-household": {
      code: "PRT",
      names: ["Sapu Lantai", "Wajan Anti Lengket", "Spatula Silikon", "Kotak Makan", "Botol Termos", "Pisau Dapur", "Pel Lantai", "Rak Sepatu Susun", "Gantungan Baju", "Keset Memory Foam"]
    },
    "cat-automotive": {
      code: "OTO",
      names: ["Oli Mesin Matic", "Pembersih Kaca", "Kanebo Microfiber", "Parfum Mobil", "Busi Motor", "Kampas Rem Depan", "Helm Half Face", "Sarung Tangan", "Cover Mobil", "Pembersih Rantai"]
    },
    "cat-sports": {
      code: "OLR",
      names: ["Matras Yoga", "Dumbbell 5kg", "Tali Skipping", "Tas Ransel", "Botol Minum Sport", "Kacamata Renang", "Jersey Olahraga", "Celana Running", "Tenda Dome 4P", "Senter LED"]
    },
    "cat-toys": {
      code: "MNH",
      names: ["Lego Creator", "Action Figure", "Mobil RC", "Kartu Pokemon", "Rubik 3x3", "Boneka Beruang", "Puzzle 1000pcs", "Slime Pewangi", "Papan Catur", "Mainan Blok"]
    },
    "cat-beauty": {
      code: "KCT",
      names: ["Lipcream Matte", "Bedak Tabur", "Foundation Liquid", "Serum Wajah", "Facial Wash", "Sunscreen SPF 50", "Micellar Water", "Masker Sheet", "Pensil Alis", "Eyeliner Pen"]
    }
  };

  const items = [];
  const categoryIds = Object.keys(categoryTemplates);
  
  // We have 10 categories * 10 names = 100 base templates.
  // Variants per base template = ceil(numItems / 100)
  const variantsPerTemplate = Math.max(1, Math.ceil(numItems / 100));
  let itemCounter = 0;

  outerLoop: for (const catId of categoryIds) {
    const template = categoryTemplates[catId];
    const catPrefix = template.code;
    
    for (let baseIdx = 0; baseIdx < template.names.length; baseIdx++) {
      const baseName = template.names[baseIdx];
      // Create a short code from name
      const baseShort = baseName.split(" ").map(w => w[0]).join("").substring(0, 4).toUpperCase();
      
      for (let varIdx = 1; varIdx <= variantsPerTemplate; varIdx++) {
        if (itemCounter >= numItems) break outerLoop;
        
        itemCounter++;
        const itemId = `item-${itemCounter}`;
        const sku = `${catPrefix}-${String(itemCounter).padStart(7, "0")}`;
        const barcode = `899${String(itemCounter).padStart(10, "0")}`;
        const name = `${baseName} V-${varIdx}`;
        
        const buyPrice = Math.floor(Math.random() * 100) * 1000 + 5000;
        const sellPrice = Math.floor(buyPrice * (1.2 + Math.random() * 0.3));
        const minStock = [5, 10, 20, 50][Math.floor(Math.random() * 4)];
        const reorderPoint = minStock * 2;
        const unitId = units[Math.floor(Math.random() * units.length)].id;
        
        items.push({
          id: itemId,
          sku,
          barcode,
          name,
          description: `Deskripsi untuk produk ${name} dengan SKU ${sku}`,
          buyPrice,
          sellPrice,
          minStock,
          reorderPoint,
          categoryId: catId,
          unitId,
          isActive: Math.random() > 0.05, // 95% active
          trackSerial: false,
          trackBatch: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  console.log("📥 Inserting items in database (using chunks)...");
  await chunkedCreateMany(prisma.item, items, 2000);
  console.log(`📥 Seeded ${items.length} items.`);

  // 8. Generate Item Locations (Stock quantities)
  console.log("📦 Generating item locations...");
  const itemLocations = [];
  let itemLocCounter = 0;

  for (const item of items) {
    const locProbs = [
      { locId: locations[0].id, prob: 0.70 }, // Gudang Utama: 70% chance
      { locId: locations[1].id, prob: 0.40 }, // Toko Jakarta: 40% chance
      { locId: locations[2].id, prob: 0.30 }, // Toko Surabaya: 30% chance
    ];
    
    let hasLocation = false;
    for (const { locId, prob } of locProbs) {
      if (Math.random() < prob) {
        hasLocation = true;
        itemLocCounter++;
        
        const rand = Math.random();
        let quantity = 0;
        if (rand < 0.10) {
          quantity = 0; // 10% out of stock
        } else if (rand < 0.25) {
          quantity = Math.floor(Math.random() * item.reorderPoint) + 1; // 15% low stock
        } else {
          quantity = Math.floor(Math.random() * (item.reorderPoint * 4)) + item.reorderPoint + 1; // 75% normal
        }
        
        itemLocations.push({
          id: `il-${itemLocCounter}`,
          itemId: item.id,
          locationId: locId,
          quantity,
          updatedAt: new Date(),
        });
      }
    }
    
    // Ensure every item has at least one location record (to avoid being orphaned)
    if (!hasLocation) {
      itemLocCounter++;
      itemLocations.push({
        id: `il-${itemLocCounter}`,
        itemId: item.id,
        locationId: locations[0].id,
        quantity: 0,
        updatedAt: new Date(),
      });
    }
  }

  console.log("📥 Inserting item locations in database...");
  await chunkedCreateMany(prisma.itemLocation, itemLocations, 2000);
  console.log(`📥 Seeded ${itemLocations.length} item locations.`);

  // 9. Generate Transaction History
  // Generate transactions for ~10% of items, min 100, max 2000
  const txCount = Math.min(2000, Math.max(100, Math.floor(numItems * 0.1)));
  console.log(`📦 Generating ${txCount} stock transactions...`);
  const transactions = [];

  for (let i = 1; i <= txCount; i++) {
    const item = items[Math.floor(Math.random() * items.length)];
    const type = ["PURCHASE", "SALE", "TRANSFER_IN", "TRANSFER_OUT", "ADJUSTMENT"][Math.floor(Math.random() * 5)];
    const qty = Math.floor(Math.random() * 20) + 1;
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    // Spread timestamps across the last 6 months
    const createdAt = new Date();
    createdAt.setMonth(createdAt.getMonth() - Math.floor(Math.random() * 6));
    createdAt.setDate(Math.floor(Math.random() * 28) + 1);
    createdAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

    transactions.push({
      id: `tx-${i}`,
      type,
      itemId: item.id,
      fromLocationId: type === "TRANSFER_OUT" || type === "SALE" ? location.id : null,
      toLocationId: type === "TRANSFER_IN" || type === "PURCHASE" ? location.id : null,
      quantity: qty,
      unitCost: type === "PURCHASE" ? item.buyPrice : null,
      reference: `${type.substring(0, 3)}-2026-${String(i).padStart(4, "0")}`,
      notes: `Simulasi transaksi ${type.toLowerCase()} untuk ${item.name}`,
      userId: admin.id,
      createdAt,
    });
  }

  console.log("📥 Inserting stock transactions in database...");
  await chunkedCreateMany(prisma.stockTransaction, transactions, 2000);
  console.log(`📥 Seeded ${transactions.length} stock transactions.`);

  // 10. Generate Purchase Orders & Sales Orders
  console.log("📦 Generating Purchase Orders...");
  for (let i = 1; i <= 15; i++) {
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    const location = locations[0];
    const poId = `po-${i}`;
    const poNum = `PO-2026-${String(i).padStart(3, "0")}`;
    const status = ["DRAFT", "SENT", "PARTIAL", "RECEIVED", "CANCELLED"][Math.floor(Math.random() * 5)];
    
    await prisma.purchaseOrder.create({
      data: {
        id: poId,
        number: poNum,
        supplierId: supplier.id,
        locationId: location.id,
        status,
        userId: admin.id,
        notes: `PO simulasi untuk ${supplier.name}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    const poItemsCount = Math.floor(Math.random() * 3) + 2;
    const poItems = [];
    const usedItemIds = new Set();
    for (let j = 1; j <= poItemsCount; j++) {
      let item = items[Math.floor(Math.random() * items.length)];
      while (usedItemIds.has(item.id)) {
        item = items[Math.floor(Math.random() * items.length)];
      }
      usedItemIds.add(item.id);
      
      const qty = Math.floor(Math.random() * 50) + 10;
      poItems.push({
        id: `poi-${poId}-${j}`,
        purchaseOrderId: poId,
        itemId: item.id,
        quantity: qty,
        receivedQty: status === "RECEIVED" ? qty : status === "PARTIAL" ? Math.floor(qty / 2) : 0,
        unitCost: item.buyPrice,
      });
    }
    await prisma.purchaseOrderItem.createMany({ data: poItems });
  }

  console.log("📦 Generating Sales Orders...");
  for (let i = 1; i <= 15; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const location = locations[1];
    const soId = `so-${i}`;
    const soNum = `SO-2026-${String(i).padStart(3, "0")}`;
    const status = ["DRAFT", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"][Math.floor(Math.random() * 5)];
    
    await prisma.salesOrder.create({
      data: {
        id: soId,
        number: soNum,
        customerId: customer.id,
        locationId: location.id,
        status,
        userId: admin.id,
        notes: `SO simulasi untuk ${customer.name}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    const soItemsCount = Math.floor(Math.random() * 3) + 2;
    const soItems = [];
    const usedItemIds = new Set();
    for (let j = 1; j <= soItemsCount; j++) {
      let item = items[Math.floor(Math.random() * items.length)];
      while (usedItemIds.has(item.id)) {
        item = items[Math.floor(Math.random() * items.length)];
      }
      usedItemIds.add(item.id);
      
      const qty = Math.floor(Math.random() * 5) + 1;
      soItems.push({
        id: `soi-${soId}-${j}`,
        salesOrderId: soId,
        itemId: item.id,
        quantity: qty,
        unitPrice: item.sellPrice,
      });
    }
    await prisma.salesOrderItem.createMany({ data: soItems });
  }

  // 11. Generate Notifications
  console.log("🔔 Generating notifications...");
  await prisma.notification.createMany({
    data: [
      {
        id: "notif-1",
        userId: admin.id,
        type: "LOW_STOCK",
        title: "Stok Rendah terdeteksi",
        message: "Sistem mendeteksi beberapa item berada di bawah batas minimum.",
        isRead: false,
      },
      {
        id: "notif-2",
        userId: admin.id,
        type: "SYSTEM",
        title: "Database Seeding Selesai",
        message: `Database berhasil di-seed dengan total ${numItems} barang.`,
        isRead: false,
      }
    ]
  });

  console.log("✅ Seeding completed successfully!");
  console.log("👤 Admin Credentials: admin@stockify.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log("🧹 Memulai penghapusan data (Membersihkan database)...");
  
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
  
  console.log("✅ Seluruh data (kecuali akun pengguna) berhasil dihapus dari database.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

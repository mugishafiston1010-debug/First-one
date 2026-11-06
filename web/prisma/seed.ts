import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "change-me-now";
  await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      fullName: "Admin",
      role: "ADMIN",
      kycStatus: "APPROVED",
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });

  // Starting values only. Admins update rates in /admin/corridors.
  const corridors = [
    { fromCurrency: "RUB", toCurrency: "RWF", midRate: "16.32", marginBps: 150, fixedFee: "100", percentFeeBps: 50, minSend: "500", maxSend: "300000" },
    { fromCurrency: "RWF", toCurrency: "RUB", midRate: "0.06127", marginBps: 150, fixedFee: "0", percentFeeBps: 100, minSend: "5000", maxSend: "5000000" },
  ];
  for (const c of corridors) {
    await db.corridor.upsert({
      where: { fromCurrency_toCurrency: { fromCurrency: c.fromCurrency, toCurrency: c.toCurrency } },
      update: {},
      create: c,
    });
  }

  if ((await db.payInAccount.count()) === 0) {
    await db.payInAccount.createMany({
      data: [
        { label: "Demo agent card A", currency: "RUB", method: "CARD", provider: "Sberbank", holderName: "IVAN P.", accountNumber: "2202 2000 0000 0001", dailyLimit: "150000", perOrderLimit: "100000" },
        { label: "Demo agent SBP B", currency: "RUB", method: "SBP_PHONE", provider: "T-Bank", holderName: "ANNA S.", accountNumber: "+7 900 000-00-02", dailyLimit: "150000", perOrderLimit: "100000" },
        { label: "Demo MoMo Kigali", currency: "RWF", method: "MOBILE_MONEY", provider: "MTN MoMo", holderName: "JEAN M.", accountNumber: "+250 780 000 003", dailyLimit: "3000000", perOrderLimit: "2000000" },
      ],
    });
  }
  console.log(`Seeded. Admin: ${adminEmail}`);
}

main().finally(() => db.$disconnect());

/** Throwaway: drives an account's onboarding-quest state. Deleted after verification. */
import { prisma } from "@/lib/prisma";

const EMAIL = "inf12-check@example.com";
const [added, completed, pets] = process.argv.slice(2).map(Number);

async function main() {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });

  await prisma.task.deleteMany({ where: { userId: user.id } });
  await prisma.transaction.deleteMany({ where: { userId: user.id } });

  for (let i = 0; i < added; i++) {
    await prisma.task.create({
      data: {
        userId: user.id,
        title: `Task ${i}`,
        titleKey: `task ${i}`,
        complexityTier: 1,
        completedAt: i < completed ? new Date() : null,
      },
    });
  }

  const koala = await prisma.storeItem.findFirstOrThrow({
    where: { name: "Koala kit" },
  });
  const food = await prisma.storeItem.findFirstOrThrow({
    where: { name: "Sunflower seeds" },
  });

  for (let i = 0; i < pets; i++) {
    await prisma.transaction.create({
      data: {
        userId: user.id,
        storeItemId: koala.id,
        coinSpent: koala.coinPrice,
      },
    });
  }
  // A non-animal purchase, so the category filter is actually exercised.
  await prisma.transaction.create({
    data: { userId: user.id, storeItemId: food.id, coinSpent: food.coinPrice },
  });

  console.log(JSON.stringify({ added, completed, pets }));
}

main().finally(() => prisma.$disconnect());

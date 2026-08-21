import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  'איטלקי',
  'אסייתי',
  'עיקריות',
  'עוגות וקינוחים',
  'מרקים',
  'סלטים',
  'מאפים ולחמים',
  'צמחוני / טבעוני',
];

async function main() {
  console.log('Seeding initial categories...');

  for (const name of defaultCategories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Set default Gemini model in settings
  await prisma.appSetting.upsert({
    where: { key: 'geminiModel' },
    update: {},
    create: { key: 'geminiModel', value: 'gemini-3.7-flash' },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

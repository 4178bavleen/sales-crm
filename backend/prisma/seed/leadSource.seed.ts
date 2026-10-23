import { prisma } from '../../src/config/database.js';

const leadSources = [
  'Website',
  'Referral',
  'Cold Call',
  'LinkedIn',
  'Google Ads',
  'Facebook Ads',
  'Email Campaign',
  'Webinar',
  'Excel Import',
  'Google Sheet',
  'Trade Show',
  'Partner',
  'Other',
];

export async function seedLeadSources() {
  for (const name of leadSources) {
    await prisma.leadSource.upsert({
      where: { name },
      update: {},
      create: {
        name,
        isActive: true,
      },
    });
  }

  console.log('Lead sources seeded successfully');
}
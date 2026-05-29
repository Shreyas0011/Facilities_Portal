import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: any; // Use any to allow extended client type matching easily
};

const rawPrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

export const prisma = rawPrisma.$extends({
  result: {
    facility: {
      amenities: {
        needs: { amenities: true },
        compute(facility: any) {
          try {
            return JSON.parse(facility.amenities || '[]');
          } catch {
            return [];
          }
        },
      },
      images: {
        needs: { images: true },
        compute(facility: any) {
          try {
            return JSON.parse(facility.images || '[]');
          } catch {
            return [];
          }
        },
      },
      rules: {
        needs: { rules: true },
        compute(facility: any) {
          try {
            return JSON.parse(facility.rules || '[]');
          } catch {
            return [];
          }
        },
      },
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = rawPrisma;
}

export default prisma;

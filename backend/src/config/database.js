
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }],
});

prisma.$on('query', (event) => {
  if (event.duration >= 300) {
    console.log(
      `[PRISMA LENTO] ${event.duration} ms | ${event.query}`
    );
  }
});

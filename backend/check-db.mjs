import { prisma } from "./src/config/database.js";

console.log("Members:", await prisma.member.count());
console.log("Workers:", await prisma.worker.count());
console.log("Schedules:", await prisma.schedule.count());

await prisma.$disconnect();

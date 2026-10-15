import { prisma } from "./src/config/database.js";

async function main() {
  console.log("Churches:", await prisma.church.count());
  console.log("Roles:", await prisma.role.count());
  console.log("Permissions:", await prisma.permission.count());
  console.log("RolePermissions:", await prisma.rolePermission.count());
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
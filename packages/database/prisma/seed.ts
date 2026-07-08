import { hash } from '@node-rs/argon2';
import {
  PERMISSION_CATALOG,
  ROLE_METADATA,
  ROLE_PERMISSIONS,
  ROLE_KEYS,
  type RoleKey,
} from '@eop/shared';
import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

const env = (key: string, fallback: string): string => process.env[key] ?? fallback;

async function seedPermissions() {
  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
      },
      create: {
        key: permission.key,
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
      },
    });
  }
  console.log(`  ✓ ${PERMISSION_CATALOG.length} permissions`);
}

async function seedRoles() {
  for (const key of ROLE_KEYS) {
    const meta = ROLE_METADATA[key];
    const role = await prisma.role.upsert({
      where: { key },
      update: { name: meta.name, description: meta.description },
      create: { key, name: meta.name, description: meta.description, isSystem: true },
    });

    const permissionKeys = ROLE_PERMISSIONS[key];
    const permissions = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true },
    });

    // Reset the role's permission set to exactly match the catalogue.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
    console.log(`  ✓ role ${key} (${permissions.length} permissions)`);
  }
}

async function seedAdmin() {
  const email = env('BOOTSTRAP_ADMIN_EMAIL', 'admin@eop.dev').toLowerCase();
  const password = env('BOOTSTRAP_ADMIN_PASSWORD', 'Admin123!');
  const name = env('BOOTSTRAP_ADMIN_NAME', 'Platform Admin');
  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ') || 'Admin';

  const passwordHash = await hash(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, firstName, lastName, isActive: true },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: 'ADMIN' as RoleKey } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
    update: {},
    create: { userId: user.id, roleId: adminRole.id },
  });

  console.log(`  ✓ admin user ${email}`);
}

async function main() {
  console.log('Seeding database...');
  await seedPermissions();
  await seedRoles();
  await seedAdmin();
  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

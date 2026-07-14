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

const DEFAULT_LABELS: Array<{ name: string; color: string }> = [
  { name: 'Bug', color: '#ef4444' },
  { name: 'Feature', color: '#7c3aed' },
  { name: 'Tech Debt', color: '#f59e0b' },
  { name: 'Documentation', color: '#3b82f6' },
  { name: 'Blocked', color: '#dc2626' },
];

async function seedLabels() {
  for (const label of DEFAULT_LABELS) {
    await prisma.label.upsert({
      where: { name: label.name },
      update: { color: label.color },
      create: label,
    });
  }
  console.log(`  ✓ ${DEFAULT_LABELS.length} labels`);
}

const DEFAULT_ENVIRONMENTS: Array<{
  key: string;
  name: string;
  color: string;
  sortOrder: number;
  isProduction: boolean;
}> = [
  { key: 'development', name: 'Development', color: '#3b82f6', sortOrder: 0, isProduction: false },
  { key: 'staging', name: 'Staging', color: '#f59e0b', sortOrder: 1, isProduction: false },
  { key: 'production', name: 'Production', color: '#10b981', sortOrder: 2, isProduction: true },
];

async function seedEnvironments() {
  for (const env of DEFAULT_ENVIRONMENTS) {
    await prisma.environment.upsert({
      where: { key: env.key },
      update: { name: env.name, color: env.color, sortOrder: env.sortOrder, isProduction: env.isProduction },
      create: env,
    });
  }
  console.log(`  ✓ ${DEFAULT_ENVIRONMENTS.length} environments`);
}

async function main() {
  console.log('Seeding database...');
  await seedPermissions();
  await seedRoles();
  await seedAdmin();
  await seedLabels();
  await seedEnvironments();
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

// prisma/seed.ts
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { RedisKeys } from '../src/common/redis/redis-keys';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
});
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 10;
const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

const adminUsername = process.env.SYSTEM_USERNAME || 'admin';
const adminEmail = process.env.SYSTEM_EMAIL || 'admin@email.com';
const adminPassword = process.env.SYSTEM_PASSWORD || 'Admin@123!';


function toDateOnly(value: string) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Instantiate raw ioredis with the same config values your appConfig uses
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
});



async function main() {

  await seedRoleAndPermission()
  await seedUsers();


}

main()
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await redis.quit();
    await prisma.$disconnect();
  });


// create admin user and manager user with hashed password
async function seedUsers() {
  const usersData = [
    {
      email: adminEmail,
      username: adminUsername,
      password: await hashPassword(adminPassword),
      first_name: 'Admin',
      last_name: 'User',
      role: 'Admin',
    },
    {
      email: 'manager@email.com',
      username: 'manager',
      password: await hashPassword('Manager@123!'),
      first_name: 'Manager',
      last_name: 'User',
      role: 'Manager',
    }
  ];

  for (const userData of usersData) {
    // find role user belongs to
    const role = await prisma.role.findUnique({ where: { name: userData.role } });
    console.log(`🔍 Found role for ${userData.email}: ${role ? role.name : 'NOT FOUND'}`);
    if (!role) {
      console.error(`Role ${userData.role} not found. Please seed roles before users.`);
      continue;
    }
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        username: userData.username,
        password: userData.password,
        first_name: userData.first_name,
        last_name: userData.last_name,
        roleUsers: {
          create: {
            role_id: role.id,
          }
        }
      },
    });
  }
}

async function seedRoleAndPermission() {
  const RESOURCES = [
    'user',
    'billing',
    'lead',
    'stage',
    'campaign',
    'activity-log',
    'template',
    'lead_group',
    'role',
    'faq',
    'gallery',
    'testimonial',
    'news-and-events-category',
    'news-and-events',
  ];

  const ACTIONS = ['create', 'read', 'update', 'delete'];
  const SPECIAL_PERMISSIONS = [
    'admin_override:delete',
    'system:maintenance',
    'staff:invite',
    'lead:import',
    'lead:export',
    'lead:assign',
    'lead:unassign',
    'lead:view_all',
    'lead_group:connect',
    'lead_group:disconnect',
    'lead_group:export',
    'permission:read',
    'member:read',
    'member:roles_update',
    'member:block',
    'member:unblock',
    'mail-management:send_email',
    'mail-management:view_logs',
    'mail-management:delete_logs',
    'payment-transaction:read',
    'payment-transaction:export',
    'payment-transaction:metrics',
    'payment-transaction:read',
    'campaign:launch',
    'campaign:report',
    'campaign:change_status',
    'notification:metrics',
    'report:campaign',
    'report:deposit_revenue',
    'report:stage',
    'report:member',
  ];

  console.log('🔄 Starting permission seeding with ioredis...');

  // 1. Build permissions list
  const permissionStrings: string[] = [];
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      permissionStrings.push(`${resource}:${action}`);
    }
  }
  permissionStrings.push(...SPECIAL_PERMISSIONS);

  // Ensure unique permission names and stable ordering for deterministic seeding.
  const desiredPermissions = Array.from(new Set(permissionStrings)).sort();

  // 2. Sync to PostgreSQL
  console.log(`📦 Reconciling ${desiredPermissions.length} permissions in PostgreSQL...`);

  // Remove permissions that are no longer declared in seed constants.
  const removed = await prisma.permission.deleteMany({
    where: {
      name: {
        notIn: desiredPermissions,
      },
    },
  });

  if (removed.count > 0) {
    console.log(`🧹 Removed ${removed.count} stale permissions from PostgreSQL`);
  }

  const upsertedPermissions = await Promise.all(
    desiredPermissions.map((permName) =>
      prisma.permission.upsert({
        where: { name: permName },
        update: {
          description: `Allows action ${permName.split(':')[1]} on ${permName.split(':')[0]}`,
        },
        create: {
          name: permName,
          description: `Allows action ${permName.split(':')[1]} on ${permName.split(':')[0]}`,
        },
      })
    )
  );

  // 3. Upsert Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', description: 'Full system access' },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: { name: 'Manager', description: 'Manage site' },
  });

  // 4. Map connections in DB
  await prisma.rolePermission.deleteMany({
    where: {
      role_id: {
        in: [adminRole.id, managerRole.id],
      },
    },
  });

  await prisma.rolePermission.createMany({
    data: upsertedPermissions.map((p) => ({ role_id: adminRole.id, permission_id: p.id })),
  });

  const managerAllowedPerms = upsertedPermissions.filter(
    (p) => p.name.startsWith('lead:') || p.name.startsWith('lead_group:')
  );
  await prisma.rolePermission.createMany({
    data: managerAllowedPerms.map((p) => ({ role_id: managerRole.id, permission_id: p.id })),
  });

  // 5. Sync to Redis via ioredis
  console.log('🚀 Syncing fresh roles cache to Redis...');

  const oldKeys: string[] = [];
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      RedisKeys.rolePermissionsPattern(),
      'COUNT',
      '100',
    );

    cursor = nextCursor;
    if (keys.length > 0) {
      oldKeys.push(...keys);
    }
  } while (cursor !== '0');

  if (oldKeys.length > 0) {
    await redis.del(...oldKeys);
  }

  // Stringify arrays and store them
  await redis.set(
    RedisKeys.rolePermissions(adminRole.name),
    JSON.stringify(desiredPermissions),
  );
  await redis.set(
    RedisKeys.rolePermissions(managerRole.name),
    JSON.stringify(managerAllowedPerms.map((p) => p.name))
  );

  // debug
  // const value = await redis.get('role:admin');
  // console.log(`🔑 Redis value for role:admin: ${value}`);

  console.log('✅ Synchronization complete!');
}

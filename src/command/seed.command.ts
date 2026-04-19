// external imports
import { Command, CommandRunner } from 'nest-commander';

// internal imports
import { StringHelper } from '../common/helper/string.helper';
import { UserRepository } from '../common/repository/user/user.repository';
import { PrismaService } from '../prisma/prisma.service';

@Command({ name: 'seed', description: 'prisma db seed' })
export class SeedCommand extends CommandRunner {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
  ) {
    super();
  }

  async run(passedParam: string[]): Promise<void> {
    await this.seed(passedParam);
  }

  async seed(param: string[]) {
    try {
      console.log(`Prisma Env: ${process.env.PRISMA_ENV}`);
      console.log('Seeding started...');

      // Transaction removed to avoid P2028 and connection issues during seed
      await this.roleSeed();
      await this.permissionSeed();
      await this.userSeed();
      await this.permissionRoleSeed();

      console.log('Seeding done successfully.');
    } catch (error) {
      console.error('Seeding Error:', error);
      throw error;
    }
  }

  //---- Role Section ----
  async roleSeed() {
    console.log('Seeding Roles...');
    await this.prisma.role.createMany({
      data: [
        { id: '1', title: 'Super Admin', name: 'su_admin' },
        { id: '2', title: 'Secretary', name: 'secretary' },
        { id: '3', title: 'Standard User', name: 'user' },
      ],
      skipDuplicates: true,
    });
  }

  //---- User Section ----
  async userSeed() {
    console.log('Seeding Users...');

    const defaultUsers = [
      {
        username: 'super_admin',
        email: 'admin@mercury.com',
        password: '123456789',
        type: 'SUP_ADMIN',
        role_id: '1',
      },
      {
        username: 'secretary_user',
        email: 'secretary@mercury.com',
        password: '123456789',
        type: 'SECRETARY',
        role_id: '2',
      },
      {
        username: 'regular_user',
        email: 'user@mercury.com',
        password: '123456789',
        type: 'USER',
        role_id: '3',
      },
    ];

    for (const userData of defaultUsers) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: userData.email },
      });

      if (!existingUser) {
        const result = await this.userRepository.createUser({
          username: userData.username,
          email: userData.email,
          password: userData.password,
          type: userData.type,
        });

        if (result.success) {
          await this.prisma.roleUser.create({
            data: { user_id: result.data.id, role_id: userData.role_id },
          });
          console.log(`User ${userData.email} created.`);
        }
      } else {
        console.log(`User ${userData.email} already exists, skipping.`);
      }
    }
  }

  //---- Permission Section ----
  async permissionSeed() {
    console.log('Seeding Permissions...');
    let i = 0;
    const permissions = [];
    const permissionGroups = [
      { title: 'system_management', subject: 'System' },
      { title: 'user_management', subject: 'User' },
      { title: 'role_management', subject: 'Role' },
      { title: 'trade_management', subject: 'Trade' },
      { title: 'lead_management', subject: 'Lead' },
    ];

    const actions = ['read', 'create', 'update', 'show', 'delete'];

    for (const group of permissionGroups) {
      for (const action of actions) {
        permissions.push({
          id: String(++i),
          title: `${group.title}_${action}`,
          action: StringHelper.cfirst(action),
          subject: group.subject,
        });
      }
    }

    await this.prisma.permission.createMany({
      data: permissions,
      skipDuplicates: true,
    });
  }

  //---- Permission Role Mapping ----
  async permissionRoleSeed() {
    console.log('Mapping Permissions to Roles...');
    const allPermissions = await this.prisma.permission.findMany();

    const permissionRoleData = [];

    allPermissions.forEach((permission) => {
      // 1. SUP_ADMIN (Role 1) -
      permissionRoleData.push({
        role_id: '1',
        permission_id: permission.id,
      });

      // 2. SECRETARY (Role 2) -
      if (!permission.title.includes('delete')) {
        permissionRoleData.push({
          role_id: '2',
          permission_id: permission.id,
        });
      }

      // 3. USER (Role 3) -  just read and show permission
      if (
        permission.title.includes('_read') ||
        permission.title.includes('_show')
      ) {
        permissionRoleData.push({
          role_id: '3',
          permission_id: permission.id,
        });
      }
    });

    await this.prisma.permissionRole.createMany({
      data: permissionRoleData,
      skipDuplicates: true,
    });
  }
}

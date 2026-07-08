import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma } from '@eop/database';
import {
  buildPageMeta,
  type AuthUser,
  type CreateUserInput,
  type ListUsersQuery,
  type Paginated,
  type PublicUser,
  type RegisterInput,
  type RoleKey,
  type UpdateProfileInput,
  type UpdateUserInput,
  DEFAULT_SELF_SIGNUP_ROLE,
} from '@eop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { HashingService } from '../security/hashing.service';
import { AuditService } from '../audit/audit.service';
import type { ClientContext } from '../common/utils/request-context';
import {
  AUTH_USER_INCLUDE,
  PUBLIC_USER_INCLUDE,
  toAuthUser,
  toPublicUser,
  type UserWithRoles,
} from './users.mapper';

const SORTABLE_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'email',
  'firstName',
  'lastName',
  'lastLoginAt',
]);

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
    private readonly audit: AuditService,
  ) {}

  // --- Reads used by the auth layer -------------------------------------------

  /** Loads the authenticated principal (roles + permissions) for the JWT strategy. */
  async findAuthUserById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: AUTH_USER_INCLUDE,
    });
    if (!user || !user.isActive) {
      return null;
    }
    return toAuthUser(user);
  }

  /** Returns the full record (including passwordHash) for credential checks. */
  findByEmailWithSecret(email: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: PUBLIC_USER_INCLUDE,
    });
  }

  findByIdWithSecret(id: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({ where: { id }, include: PUBLIC_USER_INCLUDE });
  }

  async recordLogin(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  async setPassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  // --- Registration & creation ------------------------------------------------

  /** Self-service signup — assigns the least-privilege default role. */
  async register(input: RegisterInput, ctx: ClientContext): Promise<PublicUser> {
    const user = await this.createRecord(
      { ...input, roles: [DEFAULT_SELF_SIGNUP_ROLE] },
      null,
      ctx,
      'user.registered',
    );
    return user;
  }

  /** Admin-driven creation with explicit roles. */
  create(input: CreateUserInput, actor: AuthUser, ctx: ClientContext): Promise<PublicUser> {
    return this.createRecord(input, actor, ctx, 'user.created');
  }

  private async createRecord(
    input: CreateUserInput,
    actor: AuthUser | null,
    ctx: ClientContext,
    action: string,
  ): Promise<PublicUser> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: { email: ['An account with this email already exists'] },
      });
    }

    const passwordHash = await this.hashing.hash(input.password);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        timezone: input.timezone ?? null,
        roles: {
          create: input.roles.map((key) => ({
            role: { connect: { key } },
            assignedBy: actor?.id ?? null,
          })),
        },
      },
      include: PUBLIC_USER_INCLUDE,
    });

    const publicUser = toPublicUser(user);
    await this.audit.record({
      action,
      entityType: 'User',
      entityId: user.id,
      actor: actor ?? { id: user.id, email: user.email },
      after: { email: publicUser.email, roles: publicUser.roles },
      ...ctx,
    });
    return publicUser;
  }

  // --- Queries ----------------------------------------------------------------

  async list(query: ListUsersQuery): Promise<Paginated<PublicUser>> {
    const where: Prisma.UserWhereInput = {
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.role ? { roles: { some: { role: { key: query.role } } } } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sortField = query.sort && SORTABLE_FIELDS.has(query.sort) ? query.sort : 'createdAt';

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: PUBLIC_USER_INCLUDE,
        orderBy: { [sortField]: query.order },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: rows.map(toPublicUser),
      meta: buildPageMeta(query.page, query.pageSize, total),
    };
  }

  async findById(id: string): Promise<PublicUser> {
    const user = await this.getOrThrow(id);
    return toPublicUser(user);
  }

  // --- Mutations --------------------------------------------------------------

  async update(
    id: string,
    input: UpdateUserInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<PublicUser> {
    const before = toPublicUser(await this.getOrThrow(id));
    const user = await this.prisma.user.update({
      where: { id },
      data: input,
      include: PUBLIC_USER_INCLUDE,
    });
    const after = toPublicUser(user);
    await this.audit.record({
      action: 'user.updated',
      entityType: 'User',
      entityId: id,
      actor,
      before,
      after,
      ...ctx,
    });
    return after;
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<PublicUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: input,
      include: PUBLIC_USER_INCLUDE,
    });
    const after = toPublicUser(user);
    await this.audit.record({
      action: 'user.profile_updated',
      entityType: 'User',
      entityId: userId,
      actor,
      after,
      ...ctx,
    });
    return after;
  }

  async deactivate(id: string, actor: AuthUser, ctx: ClientContext): Promise<PublicUser> {
    if (id === actor.id) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    await this.getOrThrow(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      include: PUBLIC_USER_INCLUDE,
    });
    // Invalidate all sessions for the deactivated user.
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const after = toPublicUser(user);
    await this.audit.record({
      action: 'user.deactivated',
      entityType: 'User',
      entityId: id,
      actor,
      after,
      ...ctx,
    });
    return after;
  }

  async assignRoles(
    id: string,
    roles: RoleKey[],
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<PublicUser> {
    const before = toPublicUser(await this.getOrThrow(id));
    const roleRecords = await this.prisma.role.findMany({ where: { key: { in: roles } } });
    if (roleRecords.length !== roles.length) {
      throw new BadRequestException('One or more roles are invalid');
    }

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: roleRecords.map((role) => ({ userId: id, roleId: role.id, assignedBy: actor.id })),
      }),
    ]);

    const after = toPublicUser(await this.getOrThrow(id));
    await this.audit.record({
      action: 'user.roles_changed',
      entityType: 'User',
      entityId: id,
      actor,
      before: { roles: before.roles },
      after: { roles: after.roles },
      ...ctx,
    });
    return after;
  }

  private async getOrThrow(id: string): Promise<UserWithRoles> {
    const user = await this.prisma.user.findUnique({ where: { id }, include: PUBLIC_USER_INCLUDE });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  assignRolesSchema,
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
  PERMISSIONS,
  type AssignRolesInput,
  type AuthUser,
  type CreateUserInput,
  type ListUsersQuery,
  type UpdateUserInput,
} from '@eop/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import { getClientContext } from '../common/utils/request-context';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USER_READ)
  list(@Query(zodPipe(listUsersQuerySchema)) query: ListUsersQuery) {
    return this.usersService.list(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USER_READ)
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USER_CREATE)
  create(
    @Body(zodPipe(createUserSchema)) body: CreateUserInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.usersService.create(body, actor, getClientContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USER_UPDATE)
  update(
    @Param('id') id: string,
    @Body(zodPipe(updateUserSchema)) body: UpdateUserInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.usersService.update(id, body, actor, getClientContext(req));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.USER_DELETE)
  deactivate(@Param('id') id: string, @CurrentUser() actor: AuthUser, @Req() req: Request) {
    return this.usersService.deactivate(id, actor, getClientContext(req));
  }

  @Patch(':id/roles')
  @RequirePermissions(PERMISSIONS.USER_ASSIGN_ROLES)
  assignRoles(
    @Param('id') id: string,
    @Body(zodPipe(assignRolesSchema)) body: AssignRolesInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.usersService.assignRoles(id, body.roles, actor, getClientContext(req));
  }
}

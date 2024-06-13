import { SetMetadata } from '@nestjs/common';
import { Role } from '../../enums/role.enum';


//This decorator allows specifying what roles are required to access specific resources.
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
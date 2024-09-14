import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRolePermissionDto {
  @IsNotEmpty()
  @IsString()
  readonly roleId: string;

  @IsNotEmpty()
  @IsString()
  readonly permissionId: string;
}

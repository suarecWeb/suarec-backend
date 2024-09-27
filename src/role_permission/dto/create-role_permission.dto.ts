import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRolePermissionDto {
  @IsNotEmpty()
  @IsString()
  readonly roleName: string;

  @IsNotEmpty()
  @IsString()
  readonly permissionName: string;
}

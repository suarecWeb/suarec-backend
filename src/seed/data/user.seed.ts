import { User } from "../../user/entities/user.entity";
import { Role } from "../../enums/role.enum"
import  {v4 as uuid} from 'uuid';
/* istanbul ignore next */
export const userSeed: User[] = [
    {
        email: 'juan@juan.com',
        name: 'Juan',
        password: 'juan123',
        role: Role.OWNER,
        id: uuid(),
        checkFieldsBeforeInsert: function (): void {
            throw new Error("Function not implemented.");
        }
    },
    {
        email: 'dylan@dylan.com',
        name: 'Dylan',
        password: 'dylan123',
        role: Role.ADMIN,
        id: uuid(),
        checkFieldsBeforeInsert: function (): void {
            throw new Error("Function not implemented.");
        }

    },
    {
        email: 'sara@sara.com',
        name: 'Sara',
        password: 'sara123',
        role: Role.USER,
        id: uuid(),
        checkFieldsBeforeInsert: function (): void {
            throw new Error("Function not implemented.");
        }
    },
    {
        email: 'admin@admin',
        name: 'Admin',
        password: 'admin123',
        role: Role.ADMIN,
        id: uuid(),
        checkFieldsBeforeInsert: function (): void {
            throw new Error("Function not implemented.");
        }
    },
    {
        email: 'owner@owner.com',
        name: 'Owner',
        password: 'owner123',
        role: Role.OWNER,
        id: uuid(),
        checkFieldsBeforeInsert: function (): void {
            throw new Error("Function not implemented.");
        }
    },
    {
        email: 'user@user.com',
        name: 'User',
        password: 'user123',
        role: Role.USER,
        id: uuid(),
        checkFieldsBeforeInsert: function (): void {
            throw new Error("Function not implemented.");
        }
    }
]
import type { UserRole } from '../schemas/user.schema';
export declare class CreateUserDto {
    email: string;
    password: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    address?: string;
    role?: UserRole;
}

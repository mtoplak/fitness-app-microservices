import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    register(createUserDto: CreateUserDto): Promise<{
        user: any;
        token: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        user: any;
        token: string;
    }>;
    getProfile(req: any): Promise<any>;
    updateProfile(req: any, updateUserDto: UpdateUserDto): Promise<any>;
    getUserById(id: string): Promise<any>;
    getAllUsers(): Promise<any[]>;
    getUsersByRole(role: string): Promise<any[]>;
}

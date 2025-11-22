import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { User } from '../schemas/user.schema';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
export declare class UserService {
    private userModel;
    private jwtService;
    constructor(userModel: Model<User>, jwtService: JwtService);
    register(createUserDto: CreateUserDto): Promise<{
        user: any;
        token: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        user: any;
        token: string;
    }>;
    findById(id: string): Promise<any>;
    findByEmail(email: string): Promise<any>;
    updateUser(id: string, updateUserDto: UpdateUserDto): Promise<any>;
    getAllUsers(): Promise<any[]>;
    getUsersByRole(role: string): Promise<any[]>;
    private generateToken;
    private sanitizeUser;
}

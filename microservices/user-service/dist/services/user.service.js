"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const user_schema_1 = require("../schemas/user.schema");
let UserService = class UserService {
    userModel;
    jwtService;
    constructor(userModel, jwtService) {
        this.userModel = userModel;
        this.jwtService = jwtService;
    }
    async register(createUserDto) {
        const existingUser = await this.userModel.findOne({ email: createUserDto.email });
        if (existingUser) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const user = new this.userModel({
            ...createUserDto,
            passwordHash: hashedPassword,
            role: createUserDto.role || 'member',
        });
        await user.save();
        const token = this.generateToken(user);
        return {
            user: this.sanitizeUser(user),
            token,
        };
    }
    async login(loginDto) {
        const user = await this.userModel.findOne({ email: loginDto.email });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const token = this.generateToken(user);
        return {
            user: this.sanitizeUser(user),
            token,
        };
    }
    async findById(id) {
        const user = await this.userModel.findById(id);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.sanitizeUser(user);
    }
    async findByEmail(email) {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.sanitizeUser(user);
    }
    async updateUser(id, updateUserDto) {
        const user = await this.userModel.findByIdAndUpdate(id, { $set: updateUserDto }, { new: true });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.sanitizeUser(user);
    }
    async getAllUsers() {
        const users = await this.userModel.find();
        return users.map(user => this.sanitizeUser(user));
    }
    async getUsersByRole(role) {
        const users = await this.userModel.find({ role });
        return users.map(user => this.sanitizeUser(user));
    }
    generateToken(user) {
        const payload = {
            sub: user._id.toString(),
            email: user.email,
            role: user.role
        };
        return this.jwtService.sign(payload);
    }
    sanitizeUser(user) {
        const userObj = user.toObject ? user.toObject() : user;
        const { passwordHash, ...sanitized } = userObj;
        return sanitized;
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        jwt_1.JwtService])
], UserService);
//# sourceMappingURL=user.service.js.map
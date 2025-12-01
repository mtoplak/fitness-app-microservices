import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Service API',
      version: '1.0.0',
      description: 'Authentication and User Management Service for Fitness App',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'http://localhost:8000/api',
        description: 'Kong Gateway',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            fullName: { type: 'string', example: 'John Doe' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            address: { type: 'string', example: '123 Main St' },
            membershipId: { type: 'string', example: '507f1f77bcf86cd799439012' },
            role: { 
              type: 'string', 
              enum: ['admin', 'trainer', 'member'],
              example: 'member'
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'fullName'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', minLength: 6, example: 'password123' },
            fullName: { type: 'string', example: 'John Doe' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            address: { type: 'string', example: '123 Main St' },
            role: { 
              type: 'string', 
              enum: ['admin', 'trainer', 'member'],
              example: 'member'
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            password: { type: 'string', example: 'password123' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          },
        },
        UpdateUserRequest: {
          type: 'object',
          properties: {
            fullName: { type: 'string', example: 'John Doe' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            address: { type: 'string', example: '123 Main St' },
            membershipId: { type: 'string', example: '507f1f77bcf86cd799439012' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

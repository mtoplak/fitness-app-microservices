import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { swaggerSpec } from './config/swagger.js';
import { initializeLogger, getLogger } from './utils/logger.js';
import { correlationIdMiddleware } from './middleware/correlationId.middleware.js';
import { loggingMiddleware } from './middleware/logging.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-users';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const RABBITMQ_EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'fitness-logs-exchange';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Correlation ID middleware (must be before logging)
app.use(correlationIdMiddleware);

// Logging middleware (must be after correlation ID)
app.use(loggingMiddleware);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    service: 'user-service', 
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      health: '/health',
      register: 'POST /users/register',
      login: 'POST /users/login',
      profile: 'GET /users/me',
      updateProfile: 'PUT /users/me'
    }
  });
});

app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

// Error handling
app.use(async (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  
  // Log error to RabbitMQ
  try {
    const logger = getLogger();
    await logger.error(
      `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      req.correlationId || 'no-correlation-id',
      `Error: ${err.message}`,
      { stack: err.stack }
    );
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Initialize logger (don't block on it)
    initializeLogger(RABBITMQ_URL, RABBITMQ_EXCHANGE, 'user-service')
      .then(() => console.log('✅ RabbitMQ Logger initialized'))
      .catch(err => console.error('⚠️ RabbitMQ Logger failed to initialize:', err.message));

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 User Service running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  try {
    const logger = getLogger();
    await logger.close();
  } catch (error) {
    console.error('Error closing logger:', error);
  }
  await mongoose.connection.close();
  process.exit(0);
});

startServer();

export default app;

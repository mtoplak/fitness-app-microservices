import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logsRouter, { setRabbitMQService } from './routes/logs.routes.js';
import { RabbitMQService } from './services/rabbitmq.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fitness-logs';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const RABBITMQ_EXCHANGE = process.env.RABBITMQ_EXCHANGE || 'fitness-logs-exchange';
const RABBITMQ_QUEUE = process.env.RABBITMQ_QUEUE || 'fitness-logs-queue';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/logs', logsRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'logging-service' });
});

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Initialize RabbitMQ
const rabbitMQService = new RabbitMQService(RABBITMQ_URL, RABBITMQ_EXCHANGE, RABBITMQ_QUEUE);

setRabbitMQService(rabbitMQService);

// Start server
const startServer = async () => {
  try {
    // Connect to RabbitMQ with retry logic
    let retries = 15;
    let connected = false;
    
    while (retries > 0 && !connected) {
      try {
        await rabbitMQService.connect();
        connected = true;
      } catch (error) {
        retries--;
        console.log(`⚠️ RabbitMQ connection failed, retrying... (${retries} attempts left)`);
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        } else {
          throw error;
        }
      }
    }
    
    // Note: NOT automatically consuming messages
    // Logs are fetched only when POST /logs is called
    console.log('ℹ️  Logs will be fetched from RabbitMQ only when POST /logs is called');
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Logging Service running on port ${PORT}`);
      console.log(`📋 POST /logs - Fetch logs from RabbitMQ queue`);
      console.log(`📋 GET /logs/:dateFrom/:dateTo - Get logs by date range`);
      console.log(`📋 DELETE /logs - Delete all logs from database`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await rabbitMQService.close();
  await mongoose.connection.close();
  process.exit(0);
});

startServer();

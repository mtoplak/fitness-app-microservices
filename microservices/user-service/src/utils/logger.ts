import amqp from 'amqplib';
import { Request } from 'express';

export type LogType = 'INFO' | 'ERROR' | 'WARN';

interface LogData {
  timestamp: Date;
  logType: LogType;
  url: string;
  correlationId: string;
  applicationName: string;
  message: string;
  additionalData?: any;
}

export class RabbitMQLogger {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly url: string;
  private readonly exchange: string;
  private readonly applicationName: string;
  private isConnected: boolean = false;

  constructor(url: string, exchange: string, applicationName: string) {
    this.url = url;
    this.exchange = exchange;
    this.applicationName = applicationName;
  }

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection!.createChannel();
      
      // Assert exchange
      await this.channel!.assertExchange(this.exchange, 'topic', { durable: true });
      
      this.isConnected = true;
      console.log(`✅ RabbitMQ Logger connected for ${this.applicationName}`);
    } catch (error) {
      console.error('❌ Failed to connect RabbitMQ Logger:', error);
      this.isConnected = false;
    }
  }

  async log(
    logType: LogType,
    url: string,
    correlationId: string,
    message: string,
    additionalData?: any
  ): Promise<void> {
    if (!this.isConnected || !this.channel) {
      console.warn('⚠️ RabbitMQ not connected, logging to console only');
      console.log(`${new Date().toISOString()} ${logType} ${url} Correlation: ${correlationId} [${this.applicationName}] - ${message}`);
      return;
    }

    const logData: LogData = {
      timestamp: new Date(),
      logType,
      url,
      correlationId,
      applicationName: this.applicationName,
      message,
      additionalData
    };

    try {
      const routingKey = `log.${logType.toLowerCase()}`;
      this.channel.publish(
        this.exchange,
        routingKey,
        Buffer.from(JSON.stringify(logData)),
        { persistent: true }
      );
      
      // Also log to console
      console.log(`${logData.timestamp.toISOString()} ${logType} ${url} Correlation: ${correlationId} [${this.applicationName}] - ${message}`);
    } catch (error) {
      console.error('❌ Failed to send log to RabbitMQ:', error);
    }
  }

  async info(url: string, correlationId: string, message: string, additionalData?: any): Promise<void> {
    await this.log('INFO', url, correlationId, message, additionalData);
  }

  async error(url: string, correlationId: string, message: string, additionalData?: any): Promise<void> {
    await this.log('ERROR', url, correlationId, message, additionalData);
  }

  async warn(url: string, correlationId: string, message: string, additionalData?: any): Promise<void> {
    await this.log('WARN', url, correlationId, message, additionalData);
  }

  async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.isConnected = false;
      console.log('✅ RabbitMQ Logger connection closed');
    } catch (error) {
      console.error('❌ Error closing RabbitMQ Logger:', error);
    }
  }
}

// Singleton instance
let loggerInstance: RabbitMQLogger | null = null;

export const initializeLogger = async (
  url: string,
  exchange: string,
  applicationName: string
): Promise<RabbitMQLogger> => {
  if (!loggerInstance) {
    loggerInstance = new RabbitMQLogger(url, exchange, applicationName);
    await loggerInstance.connect();
  }
  return loggerInstance;
};

export const getLogger = (): RabbitMQLogger => {
  if (!loggerInstance) {
    throw new Error('Logger not initialized. Call initializeLogger first.');
  }
  return loggerInstance;
};

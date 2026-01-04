import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import amqp from 'amqplib';

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

@Injectable()
export class LoggerService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly url: string;
  private readonly exchange: string;
  private readonly applicationName: string;
  private isConnected: boolean = false;

  constructor(applicationName: string) {
    this.url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    this.exchange = process.env.RABBITMQ_EXCHANGE || 'fitness-logs-exchange';
    this.applicationName = applicationName;
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection!.createChannel();
      await this.channel!.assertExchange(this.exchange, 'topic', {
        durable: true,
      });
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
    additionalData?: any,
  ): Promise<void> {
    if (!this.isConnected || !this.channel) {
      console.warn('⚠️ RabbitMQ not connected, logging to console only');
      console.log(
        `${new Date().toISOString()} ${logType} ${url} Correlation: ${correlationId} [${this.applicationName}] - ${message}`,
      );
      return;
    }

    const logData: LogData = {
      timestamp: new Date(),
      logType,
      url,
      correlationId,
      applicationName: this.applicationName,
      message,
      additionalData,
    };

    try {
      const routingKey = `log.${logType.toLowerCase()}`;
      this.channel.publish(
        this.exchange,
        routingKey,
        Buffer.from(JSON.stringify(logData)),
        { persistent: true },
      );
      console.log(
        `${logData.timestamp.toISOString()} ${logType} ${url} Correlation: ${correlationId} [${this.applicationName}] - ${message}`,
      );
    } catch (error) {
      console.error('❌ Failed to send log to RabbitMQ:', error);
    }
  }

  async info(
    url: string,
    correlationId: string,
    message: string,
    additionalData?: any,
  ): Promise<void> {
    await this.log('INFO', url, correlationId, message, additionalData);
  }

  async error(
    url: string,
    correlationId: string,
    message: string,
    additionalData?: any,
  ): Promise<void> {
    await this.log('ERROR', url, correlationId, message, additionalData);
  }

  async warn(
    url: string,
    correlationId: string,
    message: string,
    additionalData?: any,
  ): Promise<void> {
    await this.log('WARN', url, correlationId, message, additionalData);
  }

  private async close(): Promise<void> {
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

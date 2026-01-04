import amqp from 'amqplib';
import Log from '../models/Log.js';

export class RabbitMQService {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly url: string;
  private readonly exchange: string;
  private readonly queue: string;

  constructor(url: string, exchange: string, queue: string) {
    this.url = url;
    this.exchange = exchange;
    this.queue = queue;
  }

  async connect(): Promise<void> {
    try {
      // Connect to RabbitMQ
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection!.createChannel();

      // Assert exchange (topic type for flexible routing)
      await this.channel!.assertExchange(this.exchange, 'topic', { durable: true });

      // Assert queue
      await this.channel!.assertQueue(this.queue, { durable: true });

      // Bind queue to exchange with routing key pattern
      await this.channel!.bindQueue(this.queue, this.exchange, 'log.*');

      console.log('✅ Connected to RabbitMQ');
      console.log(`Exchange: ${this.exchange}, Queue: ${this.queue}`);
    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async fetchAllLogs(): Promise<number> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    let messageCount = 0;
    console.log('📥 Starting to fetch logs from queue...');

    while (true) {
      const msg = await this.channel.get(this.queue, { noAck: false });
      
      if (!msg) {
        break; // No more messages
      }

      try {
        const logData = JSON.parse(msg.content.toString());
        console.log(`📝 Processing log ${messageCount + 1}:`, logData.message);
        
        // Save to database
        const log = new Log(logData);
        await log.save();
        
        // Acknowledge message
        this.channel.ack(msg);
        messageCount++;
      } catch (error) {
        console.error('❌ Error processing log message:', error);
        this.channel.nack(msg, false, false);
      }
    }

    console.log(`✅ Fetched and saved ${messageCount} logs from queue`);
    return messageCount;
  }

  async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      console.log('✅ RabbitMQ connection closed');
    } catch (error) {
      console.error('❌ Error closing RabbitMQ connection:', error);
    }
  }
}

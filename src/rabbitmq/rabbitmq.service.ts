import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Channel, ChannelModel, ConsumeMessage, Options } from 'amqplib';
import amqp from 'amqplib';

export type RabbitConsumeHandler = (
  msg: ConsumeMessage,
  channel: Channel,
) => Promise<void>;

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(private readonly configService: ConfigService) {}

  getChannel(): Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }
    return this.channel;
  }

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>('rabbitmq.url');
    const prefetch = this.configService.getOrThrow<number>(
      'rabbitmq.prefetchCount',
    );

    const client = await amqp.connect(url);
    const ch = await client.createChannel();

    this.connection = client;
    this.channel = ch;

    await ch.prefetch(prefetch);

    await this.assertInfrastructure();

    this.logger.log(`RabbitMQ connected (prefetch=${prefetch})`);
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close();
    } finally {
      await this.connection?.close();
    }
  }

  private async assertInfrastructure(): Promise<void> {
    const ch = this.getChannel();

    await ch.assertQueue('orders.process', { durable: true });
    await ch.assertQueue('orders.dlq', { durable: true });
  }

  publishToQueue(
    queue: string,
    payload: unknown,
    options?: Options.Publish,
  ): boolean {
    const ch = this.getChannel();
    const body = Buffer.from(JSON.stringify(payload));

    return ch.sendToQueue(queue, body, {
      contentType: 'application/json',
      persistent: true,
      ...options,
    });
  }

  async consume(
    queue: string,
    handler: RabbitConsumeHandler,
    options?: Options.Consume,
  ): Promise<void> {
    const ch = this.getChannel();

    await ch.consume(
      queue,
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async (msg) => {
        if (!msg) {
          return;
        }
        try {
          await handler(msg, ch);
        } catch (err) {
          this.logger.error(
            `Unhandled consumer error (queue=${queue})`,
            (err as Error)?.stack ?? String(err),
          );
          try {
            ch.nack(msg, false, true);
          } catch {
            /* empty */
          }
        }
      },
      {
        noAck: false,
        ...options,
      },
    );
  }
}

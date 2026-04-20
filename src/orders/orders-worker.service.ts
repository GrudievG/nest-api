import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import type { ConsumeMessage, Channel } from 'amqplib';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { OrdersService } from './orders.service';
import { OrdersProcessMessage } from './orders-queue.types';

@Injectable()
export class OrdersWorkerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OrdersWorkerService.name);
  private readonly maxAttempts = 3;

  constructor(
    private readonly rabbitmqService: RabbitmqService,
    private readonly ordersService: OrdersService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const enabled = (process.env.WORKERS_ENABLED ?? 'true') !== 'false';
    if (!enabled) {
      this.logger.log('Orders worker disabled');
      return;
    }

    await this.rabbitmqService.consume('orders.process', async (msg, ch) => {
      await this.handleMessage(msg, ch);
    });

    this.logger.log('Orders worker subscribed: orders.process');
  }

  private async handleMessage(msg: ConsumeMessage, ch: Channel): Promise<void> {
    let payload: OrdersProcessMessage;
    try {
      payload = JSON.parse(
        msg.content.toString('utf-8'),
      ) as OrdersProcessMessage;
    } catch {
      this.logger.warn({
        outcome: 'dlq',
        reason: 'Invalid JSON payload',
      });
      this.rabbitmqService.publishToQueue('orders.dlq', {
        raw: msg.content.toString('base64'),
      });
      ch.ack(msg);
      return;
    }

    const attempt = Number(payload.attempt ?? 1);
    const messageId = payload.messageId ?? '(missing)';
    const orderId = payload.orderId;

    let errorReason: string | undefined;

    try {
      await this.ordersService.processFromQueue({ ...payload, attempt });
      this.logger.log({
        outcome: 'success',
        messageId,
        orderId,
        attempt,
      });
      ch.ack(msg);
      return;
    } catch (err) {
      errorReason = (err as Error)?.message ?? String(err);
      this.logger.warn({
        outcome: attempt >= this.maxAttempts ? 'dlq' : 'retry',
        messageId,
        orderId,
        attempt,
        reason: errorReason,
      });
    }

    if (attempt >= this.maxAttempts) {
      this.rabbitmqService.publishToQueue('orders.dlq', {
        ...payload,
        attempt,
        failReason: errorReason,
      });
      ch.ack(msg);
      return;
    }

    this.rabbitmqService.publishWithDelay(
      { ...payload, attempt: attempt + 1, failReason: errorReason },
      attempt,
    );
    ch.ack(msg);
  }
}

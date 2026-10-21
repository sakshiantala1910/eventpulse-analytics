import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EventPulseClient } from '@eventpulse/server-sdk';
import { Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './order.entity';

/**
 * Demo "business logic" service: creating a restaurant order. This is the
 * example of a server-side event — placing an order fires `order_created`
 * through the EventPulse server SDK, independent of anything the browser
 * SDK already tracked for this page.
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly eventPulse: EventPulseClient;

  constructor(
    @InjectRepository(Order) private readonly ordersRepository: Repository<Order>,
    private readonly config: ConfigService,
  ) {
    this.eventPulse = new EventPulseClient({
      baseUrl: this.config.getOrThrow<string>('EVENTPULSE_BACKEND_URL'),
      apiKey: this.config.getOrThrow<string>('EVENTPULSE_INGEST_API_KEY'),
      onError: (error) => this.logger.warn(`EventPulse track failed: ${JSON.stringify(error)}`),
    });
  }

  async create(dto: CreateOrderDto): Promise<{ id: number; total: number }> {
    const total = dto.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = this.ordersRepository.create({
      customerName: dto.customerName ?? null,
      items: dto.items,
      total,
      anonymousId: dto.anonymousId ?? null,
    });
    await this.ordersRepository.save(order);

    // Fire-and-forget from the caller's perspective: track() fails soft, so
    // a flaky analytics endpoint never blocks order confirmation.
    void this.eventPulse.track(
      'order_created',
      {
        orderId: order.id,
        total,
        itemCount: dto.items.reduce((sum, item) => sum + item.quantity, 0),
        items: dto.items.map((item) => item.name),
      },
      { anonymousId: dto.anonymousId },
    );

    return { id: order.id, total };
  }
}

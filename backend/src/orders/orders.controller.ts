import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('v1/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(201)
  async store(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }
}

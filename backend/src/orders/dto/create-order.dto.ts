import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, Min, MaxLength, ValidateNested } from 'class-validator';

export class OrderItemDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  customerName?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  // Forwarded from the browser SDK so the resulting order_created server
  // event can be attributed back to the visitor's session.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  anonymousId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sessionId?: string;
}

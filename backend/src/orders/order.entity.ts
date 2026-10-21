import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_name', type: 'varchar', length: 120, nullable: true })
  customerName: string | null;

  @Column({ type: 'simple-json' })
  items: OrderItem[];

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  total: number;

  @Column({ name: 'anonymous_id', type: 'varchar', length: 64, nullable: true })
  anonymousId: string | null;

  @Column({ name: 'session_id', type: 'varchar', length: 64, nullable: true })
  sessionId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type EventType = 'pageview' | 'custom' | 'server';
export type EventSource = 'browser' | 'server';

@Entity('events')
@Index(['eventName', 'occurredAt'])
@Index(['eventType', 'occurredAt'])
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'event_name', type: 'varchar', length: 120 })
  @Index()
  eventName: string;

  @Column({ name: 'event_type', type: 'varchar', length: 20 })
  @Index()
  eventType: EventType;

  @Column({ type: 'varchar', length: 20 })
  @Index()
  source: EventSource;

  // Identity model: anonymous_id is always present (persisted client-side),
  // user_id is attached once the demo app identifies a logged-in user.
  @Column({ name: 'anonymous_id', type: 'varchar', length: 64 })
  @Index()
  anonymousId: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64, nullable: true })
  @Index()
  userId: string | null;

  @Column({ type: 'text', nullable: true })
  url: string | null;

  @Column({ type: 'text', nullable: true })
  referrer: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Column({ name: 'ip_hash', type: 'varchar', length: 64, nullable: true })
  ipHash: string | null;

  @Column({ type: 'simple-json', nullable: true })
  properties: Record<string, unknown> | null;

  // occurred_at is client/caller-reported (may lag received_at slightly due
  // to batching/network delay); received_at is server truth.
  @Column({ name: 'occurred_at', type: 'datetime' })
  @Index()
  occurredAt: Date;

  @Column({ name: 'received_at', type: 'datetime' })
  receivedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

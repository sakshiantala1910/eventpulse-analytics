import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { EventsModule } from './events/events.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Tests set DB_PATH=:memory: for an isolated, disposable database;
        // that's a sqlite keyword, not a path, so it's used as-is.
        const dbPath = config.getOrThrow<string>('DB_PATH');

        return {
          type: 'better-sqlite3',
          database: dbPath === ':memory:' ? dbPath : join(__dirname, '..', dbPath),
          autoLoadEntities: true,
          // Fine for this take-home demo; a real project would use migrations.
          synchronize: true,
        };
      },
    }),
    EventsModule,
    AnalyticsModule,
    OrdersModule,
  ],
})
export class AppModule {}

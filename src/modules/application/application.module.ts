import { Module } from '@nestjs/common';
import { ContactModule } from './contact/contact.module';
import { FaqModule } from './faq/faq.module';
import { NotificationModule } from './notification/notification.module';
import { StreamModule } from 'src/modules/application/live/stream/stream.module';
import { CallModule } from 'src/modules/application/live/call/call.module';
import { LivekitModule } from 'src/modules/application/live/livekit/livekit.module';
import { LeadModule } from './lead/lead.module';
import { TradeModule } from './trade/trade.module';
import { ConnectionModule } from './connection/connection.module';

@Module({
  imports: [
    NotificationModule,
    ContactModule,
    FaqModule,
    StreamModule,
    CallModule,
    LivekitModule,
    LeadModule,
    TradeModule,
    ConnectionModule,
  ],
})
export class ApplicationModule {}

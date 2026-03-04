import { Module } from '@nestjs/common';
import { ContactModule } from './contact/contact.module';
import { FaqModule } from './faq/faq.module';
import { NotificationModule } from './notification/notification.module';
import { PostcommunityModule } from './postcommunity/postcommunity.module';
import { RequestModule } from 'src/modules/application/request/request.module';

@Module({
  imports: [
    NotificationModule,
    ContactModule,
    FaqModule,
    PostcommunityModule,
    RequestModule,
  ],
})
export class ApplicationModule {}

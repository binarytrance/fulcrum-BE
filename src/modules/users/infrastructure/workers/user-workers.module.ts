import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { SharedModule } from '@shared/shared.module';
import { UserMongoModule } from '@users/infrastructure/persistence/user-mongo.module';
import { UserRepository } from '@users/infrastructure/persistence/user.repository';
import { USER_REPO_PORT } from '@users/domain/ports/user-rep.port';
import { APP_STREAK_EVENT_PUBLISHER_PORT } from '@users/domain/ports/app-streak-event-publisher.port';
import { AppStreakEventPublisher } from '@users/infrastructure/workers/app-streak-event-publisher';
import { UserWorker } from '@users/infrastructure/workers/user.worker';
import { USERS_QUEUE_NAME } from '@users/domain/types/user-jobs.types';

@Module({
  imports: [
    SharedModule,
    UserMongoModule,
    BullModule.registerQueue({ name: USERS_QUEUE_NAME }),
    BullBoardModule.forFeature({ name: USERS_QUEUE_NAME, adapter: BullMQAdapter }),
  ],
  providers: [
    UserWorker,
    AppStreakEventPublisher,
    { provide: USER_REPO_PORT, useClass: UserRepository },
    { provide: APP_STREAK_EVENT_PUBLISHER_PORT, useExisting: AppStreakEventPublisher },
  ],
  exports: [BullModule, APP_STREAK_EVENT_PUBLISHER_PORT, AppStreakEventPublisher],
})
export class UserWorkersModule {}

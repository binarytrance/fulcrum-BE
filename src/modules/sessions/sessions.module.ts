import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from '@shared/shared.module';

import { SessionsController } from '@sessions/presentation/controllers/sessions.controller';
import { SessionGateway } from '@sessions/presentation/gateways/session.gateway';

import { StartSessionService } from '@sessions/application/services/start-session.service';
import { HeartbeatService } from '@sessions/application/services/heartbeat.service';
import { LogDistractionService } from '@sessions/application/services/log-distraction.service';
import { StopSessionService } from '@sessions/application/services/stop-session.service';
import { ManualSessionService } from '@sessions/application/services/manual-session.service';
import { RecoverSessionService } from '@sessions/application/services/recover-session.service';

import { SESSION_REPO_PORT } from '@sessions/domain/ports/session-repo.port';
import { SESSION_TIMER_PORT } from '@sessions/domain/ports/session-timer.port';
import { TASK_ACCESS_PORT } from '@sessions/domain/ports/task-access.port';

import { SessionRepository } from '@sessions/infrastructure/persistence/session.repository';
import { SessionMongoModule } from '@sessions/infrastructure/persistence/session-mongo.module';
import { SessionTimerAdapter } from '@sessions/infrastructure/timer/session-timer.adapter';
import { SessionWorkersModule } from '@sessions/infrastructure/workers/session-workers.module';
import { TaskAccessAdapter } from '@sessions/infrastructure/adapters/task-access.adapter';

// TaskMongoModule registers the 'Task' model needed by TaskAccessAdapter.
// SessionWorker also needs it — but that is already imported inside SessionWorkersModule.
import { TaskMongoModule } from '@tasks/infrastructure/persistence/task-mongo.module';

@Module({
  imports: [
    SharedModule,
    SessionMongoModule,
    TaskMongoModule,
    SessionWorkersModule,
    JwtModule.register({}),
  ],
  controllers: [SessionsController],
  providers: [
    // Port bindings
    { provide: SESSION_REPO_PORT, useClass: SessionRepository },
    { provide: SESSION_TIMER_PORT, useClass: SessionTimerAdapter },
    // SESSION_EVENT_PUBLISHER_PORT is provided and exported by SessionWorkersModule
    { provide: TASK_ACCESS_PORT, useClass: TaskAccessAdapter },

    // Application services
    StartSessionService,
    HeartbeatService,
    LogDistractionService,
    StopSessionService,
    ManualSessionService,
    RecoverSessionService,

    // WebSocket gateway
    SessionGateway,
  ],
})
export class SessionsModule {}
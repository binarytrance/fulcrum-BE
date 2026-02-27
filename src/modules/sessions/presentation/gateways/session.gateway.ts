import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DefaultEventsMap, Server, Socket } from 'socket.io';

/** Shape of per-connection data attached to every authenticated socket. */
interface SocketData {
  userId: string;
}

type AuthSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;

import { ConfigService } from '@shared/config/config.service';
import type { TokenPayload } from '@auth/domain/types/token.types';

import { StartSessionService } from '@sessions/application/services/start-session.service';
import { HeartbeatService } from '@sessions/application/services/heartbeat.service';
import { LogDistractionService } from '@sessions/application/services/log-distraction.service';
import { StopSessionService } from '@sessions/application/services/stop-session.service';
import { RecoverSessionService } from '@sessions/application/services/recover-session.service';

import {
  HeartbeatSchema,
  LogDistractionSchema,
  StartSessionSchema,
  StopSessionSchema,
} from '@sessions/presentation/dtos/session-gateway.dto';

@WebSocketGateway({
  namespace: '/sessions',
  cors: { origin: '*', credentials: true },
})
export class SessionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SessionGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly startSessionService: StartSessionService,
    private readonly heartbeatService: HeartbeatService,
    private readonly logDistractionService: LogDistractionService,
    private readonly stopSessionService: StopSessionService,
    private readonly recoverSessionService: RecoverSessionService,
  ) {}

  // ─── Connection Lifecycle ─────────────────────────────────────────────────────

  async handleConnection(client: AuthSocket): Promise<void> {
    try {
      const token =
        (client.handshake.auth as { token?: string })?.token ??
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) throw new Error('No token');

      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.configService.tokenSecrets.jwtAccessSecret,
      });

      // Attach userId to socket for all subsequent handlers
      client.data.userId = payload.sub;

      // Join a personal room — allows targeted server-side emits
      await client.join(payload.sub);

      this.logger.log(`Client connected: ${client.id} (user ${payload.sub})`);

      // Crash recovery: resume in-flight session if Redis has one
      const resume = await this.recoverSessionService.execute(payload.sub);
      if (resume) {
        client.emit('sessionResume', resume);
        this.logger.log(
          `Resumed session ${resume.sessionId} for user ${payload.sub} (elapsed ${resume.elapsedMs}ms)`,
        );
      }
    } catch {
      this.logger.warn(
        `Rejected WS connection: ${client.id} — invalid/missing JWT`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthSocket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Events ──────────────────────────────────────────────────────────────────

  @SubscribeMessage('startSession')
  async handleStartSession(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: unknown,
  ): Promise<void> {
    const userId: string = client.data.userId;
    try {
      const dto = StartSessionSchema.parse(data);
      const result = await this.startSessionService.execute(userId, dto.taskId);
      client.emit('sessionStarted', result);
    } catch (err) {
      client.emit('error', {
        message: (err as Error).message ?? 'Failed to start session.',
      });
    }
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: unknown,
  ): Promise<void> {
    const userId: string = client.data.userId;
    try {
      const dto = HeartbeatSchema.parse(data);
      const result = await this.heartbeatService.execute(dto.sessionId, userId);
      client.emit('heartbeatAck', result);
    } catch (err) {
      client.emit('error', {
        message: (err as Error).message ?? 'Heartbeat failed.',
      });
    }
  }

  @SubscribeMessage('logDistraction')
  async handleLogDistraction(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: unknown,
  ): Promise<void> {
    const userId: string = client.data.userId;
    try {
      const dto = LogDistractionSchema.parse(data);
      const session = await this.logDistractionService.execute({
        sessionId: dto.sessionId,
        userId,
        reason: dto.reason,
        estimatedMinutes: dto.estimatedMinutes,
      });
      client.emit('distractionLogged', {
        distractions: session.distractions,
        plantStatus: session.plantStatus,
      });
    } catch (err) {
      client.emit('error', {
        message: (err as Error).message ?? 'Failed to log distraction.',
      });
    }
  }

  @SubscribeMessage('stopSession')
  async handleStopSession(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: unknown,
  ): Promise<void> {
    const userId: string = client.data.userId;
    try {
      const dto = StopSessionSchema.parse(data);
      const session = await this.stopSessionService.execute(
        dto.sessionId,
        userId,
      );
      client.emit('sessionStopped', {
        sessionId: session.id,
        durationMinutes: session.durationMinutes,
        netFocusMinutes: session.netFocusMinutes,
        distractionCount: session.distractions.length,
        plantStatus: session.plantStatus,
        plantGrowthPercent: session.plantGrowthPercent,
        completedAt: session.endedAt,
      });
    } catch (err) {
      client.emit('error', {
        message: (err as Error).message ?? 'Failed to stop session.',
      });
    }
  }
}

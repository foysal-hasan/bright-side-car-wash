import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: 'notifications' })
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationGateway.name);
  private readonly user_sockets = new Map<string, string>();

  handleConnection(client: Socket) {
    const user_id = client.handshake.query.user_id as string;
    if (user_id) {
      this.user_sockets.set(user_id, client.id);
      this.logger.log(`User ${user_id} linked to socket session ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    for (const [user_id, socket_id] of this.user_sockets.entries()) {
      if (socket_id === client.id) {
        this.user_sockets.delete(user_id);
        this.logger.log(`User ${user_id} disconnected.`);
        break;
      }
    }
  }

  send_to_user(user_id: string, event: string, data: any): boolean {
    const socket_id = this.user_sockets.get(user_id);
    if (socket_id) {
      this.server.to(socket_id).emit(event, data);
      return true;
    }
    // test line
    this.server.emit(event, data);
    return false;
  }
}
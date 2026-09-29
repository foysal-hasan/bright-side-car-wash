import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import appConfig from 'src/config/app.config';
import * as jwt from 'jsonwebtoken';


export interface AuthenticatedSocket extends Socket {
    user_id?: string;
}

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: 'notifications',
    maxHttpBufferSize: 1e8, // 100MB
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(NotificationGateway.name);

    async handleConnection(client: AuthenticatedSocket) {
        try {
            const token = client.handshake?.auth?.token || client.handshake?.headers?.authorization?.split(' ')?.[1];

            if (!token) return client.disconnect();

            const decoded: any = jwt.verify(token, appConfig().jwt.access_token_secret);
            const user_id = decoded.sub;
            if (!user_id) return client.disconnect();

            // IMPORTANT STEP: Bind the user_id to this specific socket instance memory block
            client.user_id = user_id;

            await client.join(user_id);
            // TODO: update user status in database to 'online'
            // this.server.emit('userStatusChange', { user_id, status: 'online' });
            this.logger.log(`User ${user_id} connected seamlessly.`);
        } catch (error) {
            client.disconnect();
            this.logger.error('Connection handshake auth failure:', error);
        }
    }

    async handleDisconnect(client: AuthenticatedSocket) {
        const user_id = client.user_id;

        if (user_id) {
            // 1. Fetch all active socket instances still alive in this user's room
            const active_connections = await this.server.in(user_id).fetchSockets();

            // 2. Only mark offline if this was the last remaining tab/device closed!
            if (active_connections.length === 0) {
                // TODO: update user status in database to 'offline'
                // this.server.emit('userStatusChange', { user_id, status: 'offline' });

                this.logger.log(`User ${user_id} completely went dark.`);
            } else {
                this.logger.log(`User ${user_id} closed a tab, but remains online elsewhere.`);
            }
        }
    }


    send_to_user(user_id: string, event: string, data: any): boolean {
        this.server.to(user_id).emit(event, data);
        return true;
    }
}
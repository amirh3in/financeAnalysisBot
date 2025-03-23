import 'fastify';
import { Server, Socket } from 'socket.io';

declare module 'fastify' {
    interface FastifyInstance {
        io: Server<{ hello: string }>;
        telegramBot: TelegramBot;
        prisma: PrismaClient;
    }
}

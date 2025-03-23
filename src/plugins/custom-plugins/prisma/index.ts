// filepath: /d:/personal/projects/TeamSync/FastifyApi/src/plugins/prismaPlugin.ts
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

const prismaPlugin = fp(async (fastify, opts) => {
    const prisma = new PrismaClient();
    await prisma.$connect();

    fastify.decorate('prisma', prisma);

    fastify.addHook('onClose', async (fastify: any) => {
        await fastify.prisma.$disconnect();
    });
});

export default prismaPlugin;

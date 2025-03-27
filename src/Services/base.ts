import { PrismaClient } from "@prisma/client";
import { FastifyReply } from "fastify";
import { FastifyInstance } from "fastify/types/instance";

export class baseService {
    public context: PrismaClient;
    public fastify: FastifyInstance

    constructor(prisma: PrismaClient, fastify: FastifyInstance) {
        this.context = prisma;
        this.fastify = fastify;
    }

    getResult(reply: FastifyReply, data?: any, code: number = 200) {
        return reply.status(code).send(data);
    }
}

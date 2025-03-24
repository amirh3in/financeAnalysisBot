import { PrismaClient } from "@prisma/client";
import { FastifyReply } from "fastify";

export class baseService {
    public context: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.context = prisma;
    }

    getResult(reply: FastifyReply, data?: any, code: number = 200) {
        return reply.status(code).send(data);
    }
}

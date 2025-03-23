import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, User } from '@prisma/client';
import { AddUserSchema } from '../models/im/add_user';
import { BasePageAndSizeSchema } from '../models/im/page_and_size';
import { LoginParamSchema } from '../models/im/login_param';
import { makeRes } from '../models';

export class UserService {
    private context: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.context = prisma;
    }

    async createUser(request: FastifyRequest<{ Body: AddUserSchema }>, reply: FastifyReply) {
        const newUser: User = await this.context.user.create({
            data: {
                username: request.body.username,
                password: request.body.password,
                company: request.body.company ?? '',
                verified: true,
                status: 1,
                role: request.body.role,
            },
        });

        return reply.status(200).send(newUser);
    }

    async GetAllUsers(request: FastifyRequest<{ Body: BasePageAndSizeSchema & { username?: string; company?: string } }>, reply: FastifyReply) {
        const page = Number(request.body.page) || 1;
        const size = Number(request.body.size) || 10;
        const { username, company } = request.body;

        const [users, totalCount] = await Promise.all([
            this.context.user.findMany({
                skip: (page - 1) * size,
                take: size,
                where: {
                    ...(username && { username: { contains: username, mode: 'insensitive' } }),
                    ...(company && { company: { contains: company, mode: 'insensitive' } }),
                },
                select: {
                    id: true,
                    username: true,
                    company: true,
                    role: true,
                    status: true,
                    verified: true,
                },
            }),
            this.context.user.count({
                where: {
                    ...(username && { username: { contains: username, mode: 'insensitive' } }),
                    ...(company && { company: { contains: company, mode: 'insensitive' } }),
                },
            }),
        ]);

        return reply.send({
            data: users,
            totalCount,
            page,
            size,
        });
    }

    async LoginUser(request: FastifyRequest<{ Body: LoginParamSchema }>, reply: FastifyReply) {
        const user = await this.context.user.findFirst({
            where: {
                username: request.body.username,
                password: request.body.password,
            },
        });

        if (!user) {
            return reply.status(400).send(makeRes(false, null, 'user not found!', 404));
        }

        return reply.status(200).send(makeRes(true, user));
    }
}

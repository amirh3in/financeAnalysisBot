import { PrismaClient, Trade } from '@prisma/client';

export class FinanceService {
    private context: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.context = prisma;
    }

    async addTrade(trade: Trade) {
        const newTrade: Trade = await this.context.trade.create({
            data: trade
        })

        return newTrade;
    }
}

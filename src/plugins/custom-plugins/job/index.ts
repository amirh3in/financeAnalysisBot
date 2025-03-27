import fp from 'fastify-plugin';
import { FinanceService } from '../../../services/financeService'
import cron from 'node-cron'
import { loginfo } from '../../../logger';
// import sendLog from '../../../services/logger';



const prismaPlugin = fp(async (fastify, opts) => {

    let cronconfig: string = process.env.SIGNAL_INTERVAL ?? "";
    cron.schedule(cronconfig, () => {
        console.log('Running a task every minute');

        loginfo("executing job", fastify.telegramBot)
        let financial = new FinanceService(fastify.prisma, fastify);

        financial.checkforOpportunities()
        // sendLog("info", 'Running a task every minute')
        // Add your task logic here
    });
});

export default prismaPlugin;

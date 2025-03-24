import fp from 'fastify-plugin';
import { FinanceService } from '../../../services/financeService'
import cron from 'node-cron'
import { loginfo } from '../../../services/logger';
// import sendLog from '../../../services/logger';



const prismaPlugin = fp(async (fastify, opts) => {
    cron.schedule('*/30 * * * *', () => {
        console.log('Running a task every minute');

        loginfo("executing job")
        let financial = new FinanceService(fastify.prisma);

        let res = financial.checkforOpportunities()
        // sendLog("info", 'Running a task every minute')
        // Add your task logic here
    });
});

export default prismaPlugin;

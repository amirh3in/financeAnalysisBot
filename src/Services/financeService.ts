import { Trade } from '@prisma/client';
import sendLog from './logger';
import { CandleResponse, OrderBlockVM } from '../finance/types';
import { calculatePercentageChange, formatData } from '../finance/util';
import { GetByOrderBlockStrategy } from '../finance/algOrderBlock';
// import { FastifyInstance } from 'fastify';
import { baseService } from './base';
import * as dotenv from 'dotenv'

dotenv.config()
export class FinanceService extends baseService {

    async addTrade(trade: Trade) {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        let exist = await this.context.trade.findFirst({
            where: {
                candleTimeStamp: {
                    equals: trade.candleTimeStamp
                },
                recordDate: {
                    gte: twoHoursAgo
                }
            }
        })

        if (exist)
            return null;

        let newTrade = await this.context.trade.create({
            data: trade
        })

        return newTrade;
    }

    async checkforOpportunities() {
        try {
            const { tomorrow, fifteenDaysAgo } = getTimeRange()
            const symbol = "xauusd"
            let url = `https://api.finage.co.uk/agg/forex/${symbol}/3/hour/${fifteenDaysAgo}/${tomorrow}/?apikey=${process.env.FOREX_API}`;

            var response = await fetch(url);

            if (response.status != 200)
                return await sendLog("error", `error from api: ${response.statusText}`)

            var res: { results: CandleResponse[] } = await response.json();
            res.results.sort((a, b) => b.t - a.t);


            let sortedList = formatData(res.results, symbol)

            let result = GetByOrderBlockStrategy(sortedList);


            // 1- loop through the trade opportunities.
            result.forEach(async (item: OrderBlockVM) => {

                let zoneLow,
                    zoneHigh,
                    isBuy;

                if (item.baseHigh != null && item.baseLow != null) {
                    zoneLow = item.baseLow;
                    zoneHigh = item.baseHigh
                } else {
                    zoneLow = item.rangeLow;
                    zoneHigh = item.rangeHigh;
                }

                const currentPrice = sortedList[0].close
                isBuy = Math.abs(currentPrice - zoneHigh) < Math.abs(currentPrice - zoneLow)

                let change = 0;
                // 2- filter the closest to currentprice, each distance bellow 0.20% should be alarmed
                if (isBuy)
                    change = calculatePercentageChange(currentPrice, zoneHigh)
                else
                    change = calculatePercentageChange(currentPrice, zoneLow)

                // 3- if the price is bellow the zone, it should be sell signal. if the price was above, it should be buy signal
                if ((currentPrice > zoneHigh || currentPrice < zoneLow) && change <= 0.70) {// if the price was not in the zone

                    let entry = zoneHigh

                    if (isBuy) {
                        let sl = zoneLow - 0.05
                        let tp = (Math.abs(sl - entry) * 3) + entry

                        //@ts-ignore
                        let newTrade: Trade = {
                            pair: symbol,
                            algoritm: 'order block',
                            tp: tp,
                            sl: sl,
                            candleTime: item.time,
                            candleInfo: JSON.stringify(item),
                            candleTimeStamp: String(item.timestamp),
                            orderType: 1,
                            status: 0
                        }
                        let addRes = await this.addTrade(newTrade)
                        if (addRes)
                            await sendLog("Signal", `🟢 buy signal on ${symbol}\nEntry: ${entry}\nSL: ${sl}\nTP: ${tp}\nzoneHigh: ${zoneHigh}\nzoneLow: ${zoneLow}`, item.time)
                    } else {
                        let sl = zoneLow + 0.05
                        let tp = entry - (Math.abs(sl - entry) * 3)

                        //@ts-ignore
                        let newTrade: Trade = {
                            pair: symbol,
                            algoritm: 'order block',
                            tp: tp,
                            sl: sl,
                            candleTime: item.time,
                            candleInfo: JSON.stringify(item),
                            candleTimeStamp: String(item.timestamp),
                            orderType: 0,
                            status: 0
                        }
                        let addRes = await this.addTrade(newTrade)

                        if (addRes)
                            await sendLog("Signal", `🔴 Sell signal on ${symbol}\nEntry: ${entry}\nSL: ${sl}\nTP: ${tp}\nzoneHigh: ${zoneHigh}\nzoneLow: ${zoneLow}`, item.time)

                    }

                }
            })


            return result;

        } catch (err: any) {
            sendLog("exeption: ", err?.message)
        }
    }
}


function getTimeRange(): { tomorrow: string; fifteenDaysAgo: string } {
    // Get current date
    const today = new Date();

    // Calculate tomorrow's date
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Calculate date 15 days ago
    const fifteenDaysAgo = new Date(today);
    fifteenDaysAgo.setDate(today.getDate() - 15);

    // Format date as YYYY-MM-DD
    const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return {
        tomorrow: formatDate(tomorrow),
        fifteenDaysAgo: formatDate(fifteenDaysAgo)
    };
}

import { Trade } from '@prisma/client';
import sendLog from './logger';
import { CandleResponse, Candlestick, OrderBlockVM } from '../finance/types';
import { calculatePercentageChange, formatData } from '../finance/util';
import { GetByOrderBlockStrategy } from '../finance/algOrderBlock';
// import { FastifyInstance } from 'fastify';
import { baseService } from './base';
import * as dotenv from 'dotenv'
import { EStatus } from '../models/enums/EStatus';
import { EOrderType } from '../models/enums/EOrderType';

dotenv.config()
export class FinanceService extends baseService {

    async addTrade(trade: Trade) {
        let limit = 4;

        const HoursAgo = new Date(Date.now() - limit * 60 * 60 * 1000);

        let exist = await this.context.trade.findFirst({
            where: {
                candleTimeStamp: {
                    equals: trade.candleTimeStamp
                },
                recordDate: {
                    gte: HoursAgo
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
            const symbol = "xauusd",
                time: "minute" | "hour" = "minute",
                interval = "15"

            await this.runCheck(time, symbol, interval)
            await this.runCheck("hour", symbol, "3")

        } catch (err: any) {
            sendLog("exeption: ", err?.message)
        }
    }

    async runCheck(time: "minute" | "hour", symbol: string, interval: string) {
        const { tomorrow, daysAgo } = getTimeRange(time)
        let url = `https://api.finage.co.uk/agg/forex/${symbol}/${interval}/${time}/${daysAgo}/${tomorrow}/?apikey=${process.env.FOREX_API}`;
        const timeFrame = time == "minute" ? "15m" : "3h"
        var response = await fetch(url);

        if (response.status != 200)
            return await sendLog("error", `error from api: ${response.statusText}`)

        var res: { results: CandleResponse[] } = await response.json();
        res.results.sort((a, b) => b.t - a.t);


        let sortedList = formatData(res.results, symbol)

        let idealRate = time == "minute" ? 0.03 : 0.10
        let result = GetByOrderBlockStrategy(sortedList, idealRate);


        // 1- loop through the trade opportunities.
        result.forEach(async (item: OrderBlockVM) => {

            let zoneLow: number,
                zoneHigh: number,
                isBuy: boolean;

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
            if ((currentPrice > zoneHigh || currentPrice < zoneLow) && change <= (time == "minute" ? 0.20 : 0.70)) {// if the price was not in the zone

                let entry: number,
                    sl: number,
                    tp: number,
                    signalDesc: string;
                // here count countCandlesInRange
                let afterCandles = sortedList.filter(x => x.id < item.id);
                const { closeInRangeCount, passesThroughRangeCount } = countCandlesInRange(afterCandles, zoneLow, zoneHigh)

                if (isBuy) {
                    entry = zoneHigh
                    sl = zoneLow - 0.05
                    tp = (Math.abs(sl - entry) * 3) + entry
                    signalDesc = '🟢 buy signal on ';
                    // //@ts-ignore
                    // let newTrade: Trade = {
                    //     pair: symbol,
                    //     algoritm: 'order block',
                    //     tp: tp,
                    //     sl: sl,
                    //     candleTime: item.time,
                    //     candleInfo: JSON.stringify(item),
                    //     volume: item.volume,
                    //     candleTimeStamp: String(sortedList[0].timestamp),
                    //     orderType: EOrderType.BUY,
                    //     status: EStatus.PENDING,
                    //     timeFrame: timeFrame
                    // }
                    // let addRes = await this.addTrade(newTrade)
                    // if (addRes)
                    //     await sendLog("Signal", `🟢 buy signal on ${symbol.toUpperCase()}\nTimeFrame: ${timeFrame}\nEntry: ${entry}\nSL: ${sl}\nTP: ${tp}\nzoneHigh: ${zoneHigh}\nzoneLow: ${zoneLow}\nvolume: ${item.volume} \n\n #${symbol} #${timeFrame} #${symbol}${timeFrame}`, item.time)
                } else {
                    entry = zoneLow
                    sl = zoneHigh + 0.05
                    tp = entry - (Math.abs(sl - entry) * 3)
                    signalDesc = '🔴 Sell signal on ';

                    // //@ts-ignore
                    // let newTrade: Trade = {
                    //     pair: symbol,
                    //     algoritm: 'order block',
                    //     tp: tp,
                    //     sl: sl,
                    //     candleTime: item.time,
                    //     volume: item.volume,
                    //     candleInfo: JSON.stringify(item),
                    //     candleTimeStamp: String(sortedList[0].timestamp),
                    //     orderType: EOrderType.SELL,
                    //     status: EStatus.PENDING,
                    //     timeFrame: timeFrame
                    // }
                    // let addRes = await this.addTrade(newTrade)

                    // if (addRes)
                    //     await sendLog("Signal", `🔴 Sell signal on ${symbol.toUpperCase()}\nTimeFrame: ${timeFrame}\nEntry: ${entry}\nSL: ${sl}\nTP: ${tp}\nzoneHigh: ${zoneHigh}\nzoneLow: ${zoneLow}\nvolume: ${item.volume} \n\n #${symbol} #${timeFrame} #${symbol}${timeFrame}`, item.time)

                }



                //@ts-ignore
                let newTrade: Trade = {
                    pair: symbol,
                    algoritm: 'order block',
                    tp: tp,
                    sl: sl,
                    candleTime: item.time,
                    candleInfo: JSON.stringify(item),
                    volume: item.volume,
                    candleTimeStamp: String(sortedList[0].timestamp),
                    orderType: EOrderType.BUY,
                    status: EStatus.PENDING,
                    timeFrame: timeFrame
                }


                let addRes = await this.addTrade(newTrade)

                if (addRes)
                    await sendLog("Signal", `${signalDesc} ${symbol.toUpperCase()}\nTimeFrame: ${timeFrame}\nEntry: ${entry}\nSL: ${sl}\nTP: ${tp}\n-------------------------\n\nzoneHigh: ${zoneHigh}\nzoneLow: ${zoneLow}\nvolume: ${item.volume}\nclosedInCount: ${closeInRangeCount}\nPassesThroughCount: ${passesThroughRangeCount} \n\n #${symbol} #${timeFrame} #${symbol}${timeFrame}`, item.time)

            }
        })

    }
}

function countCandlesInRange(candles: Candlestick[], minRange: number, maxRange: number) {
    let closeInRangeCount = 0;
    let passesThroughRangeCount = 0;

    for (const candle of candles) {
        const { open, close } = candle;

        // Check if close is within the range
        if (close >= minRange && close <= maxRange) {
            closeInRangeCount++;
        }

        // Check if candle passes through the range but both open and close are outside
        if ((open < minRange && close > maxRange) ||  // Opens below and closes above
            (open > maxRange && close < minRange)) {  // Opens above and closes below
            passesThroughRangeCount++;
        }
    }

    return {
        closeInRangeCount,
        passesThroughRangeCount
    };
}


function getTimeRange(timeframe: string): { tomorrow: string; daysAgo: string } {
    // Get current date
    const today = new Date();

    // Calculate tomorrow's date
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Calculate date 15 days ago
    let dayCount = timeframe == "minute" ? 5 : 15;
    const daysAgo = new Date(today);
    daysAgo.setDate(today.getDate() - dayCount);

    // Format date as YYYY-MM-DD
    const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return {
        tomorrow: formatDate(tomorrow),
        daysAgo: formatDate(daysAgo)
    };
}

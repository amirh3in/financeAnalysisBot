import { Trade } from '@prisma/client';
import sendLog from '../logger';
import { CandleResponse, Candlestick, OrderBlockVM, SignalTradeVM } from '../finance/types';
import { calculatePercentageChange, formatData } from '../finance/util';
import { GetByOrderBlockStrategy } from '../finance/algOrderBlock';
// import { FastifyInstance } from 'fastify';
import { baseService } from './base';
import * as dotenv from 'dotenv'
import { EStatus } from '../models/enums/EStatus';
import { EOrderType } from '../models/enums/EOrderType';
import { ESignalType } from '../models/enums/ESignalType';
import type { TimeFrame } from '../models/finance';
import { logTextFile } from '../logger/textLogger';

dotenv.config()
export class FinanceService extends baseService {

    async addTrade(trade: Trade) {
        let limit = trade.timeFrame == "3h" ? 6 : 4;


        const HoursAgo = new Date(Date.now() - limit * 60 * 60 * 1000);

        let exist;

        // if (trade.timeFrame == '3h')
        //     exist = await this.context.trade.findFirst({
        //         where: {
        //             candleTimeStamp: {
        //                 equals: trade.candleTimeStamp
        //             }
        //         }
        //     })
        // else
        exist = await this.context.trade.findFirst({
            where: {
                candleTimeStamp: trade.candleTimeStamp,
                orderType: trade.orderType,
                timeFrame: trade.timeFrame,
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
            const symbol = "xauusd";

            let res = await this.runCheck(symbol, "3", '3h')
            res ??= [];
            await this.runCheck(symbol, "5", '5m', res)

        } catch (err: any) {
            sendLog("exeption: ", err?.message)
        }
    }

    async runCheck(symbol: string, interval: string, timeFrame: TimeFrame, upperTimeZones?: SignalTradeVM[]) {
        const { tomorrow, daysAgo, timeTitle } = getTimeRange(timeFrame)
        let url = `https://api.finage.co.uk/agg/forex/${symbol}/${interval}/${timeTitle}/${daysAgo}/${tomorrow}/?apikey=${process.env.FOREX_API}`;
        // const timeFrame: TimeFrame = time == "minute" ? "15m" : "3h"
        var response = await fetch(url);

        if (response.status != 200)
            return await sendLog("error", `error from api: ${response.statusText}`)

        var res: { results: CandleResponse[] } = await response.json();
        res.results.sort((a, b) => b.t - a.t);


        let sortedList = formatData(res.results, symbol)

        let idealRate = timeFrame == "5m" ? 0.03 : 0.10
        let strategyRes = GetByOrderBlockStrategy(sortedList, idealRate);
        let result: SignalTradeVM[] = [];

        await logTextFile({ data: JSON.stringify(strategyRes), title: `strategies result ${timeFrame}`, caption: "⌚Time: " + new Date().toLocaleString() })

        // 1- loop through the trade opportunities.
        strategyRes.forEach(async (item: OrderBlockVM) => {

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

            let inBiggerZone = false;

            if (upperTimeZones && upperTimeZones?.length != 0)
                inBiggerZone = tradableinAnyZone(zoneLow, zoneHigh, upperTimeZones)

            if (timeFrame != '3h' && !inBiggerZone)
                return;

            const currentPrice = sortedList[0].close
            isBuy = Math.abs(currentPrice - zoneHigh) < Math.abs(currentPrice - zoneLow)

            let change = 0;
            // 2- filter the closest to currentprice, each distance bellow 0.20% should be alarmed
            if (isBuy)
                change = calculatePercentageChange(currentPrice, zoneHigh)
            else
                change = calculatePercentageChange(currentPrice, zoneLow)

            // 3- if the price is bellow the zone, it should be sell signal. if the price was above, it should be buy signal
            // (currentPrice > zoneHigh || currentPrice < zoneLow) &&
            if (change <= (timeFrame == "5m" ? 0.20 : 0.70)) {// if the price was not in the zone

                let entry: number = 0,
                    sl: number = 0,
                    tp: number = 0,
                    signalDesc: string;


                // filtering zone that has less close candle. meaning the less candle closed in that range then the range is more valid
                let afterCandles = sortedList.filter(x => x.id < item.id);
                const { closeInRangeCount, passesThroughRangeCount } = countCandlesInRange(afterCandles, zoneLow, zoneHigh)
                if ((timeFrame == "5m" || timeFrame == "15m") && closeInRangeCount > 10)
                    return
                else if (timeFrame == "3h" && closeInRangeCount > 5)
                    return;



                // check if the timeframe is for support or trade
                if (timeFrame != '3h') {// signal for trade

                    // filling data with buy or sell signal
                    if (isBuy) {
                        entry = zoneHigh
                        sl = Number((zoneLow - 0.05).toFixed(5))
                        tp = Number(((Math.abs(sl - entry) * 3) + entry).toFixed(5))
                        signalDesc = '🟢 buy signal on ';
                    } else {
                        entry = zoneLow
                        sl = Number((zoneHigh + 0.05).toFixed(5))
                        tp = Number((entry - (Math.abs(sl - entry) * 3)).toFixed(5))
                        signalDesc = '🔴 Sell signal on ';
                    }
                } else {// signal for support
                    signalDesc = 'support Discovered on ';
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
                    signalType: ESignalType.TRADE,
                    candleTimeStamp: String(sortedList[0].timestamp),
                    orderType: isBuy ? EOrderType.BUY : EOrderType.SELL,
                    status: EStatus.PENDING,
                    timeFrame: timeFrame
                }

                result.push({
                    ...newTrade,
                    zoneHigh: zoneHigh,
                    zoneLow: zoneLow
                })

                let addRes = await this.addTrade(newTrade)

                if (addRes)
                    await sendLog("Signal", `${signalDesc} ${symbol.toUpperCase()}\nTimeFrame: ${timeFrame}\nEntry: ${entry}\nSL: ${sl}\nTP: ${tp}\n-------------------------\n\nzoneHigh: ${zoneHigh}\nzoneLow: ${zoneLow}\nvolume: ${item.volume}\nclosedInCount: ${closeInRangeCount}\nPassesThroughCount: ${passesThroughRangeCount} \n\n #${symbol} #${timeFrame} #${symbol}${timeFrame}`, item.time)

            }
        })

        return result;
    }
}

function tradableinAnyZone(zoneLow: number, zoneHigh: number, upperZones: SignalTradeVM[]) {
    let result = upperZones.filter(x => x.zoneHigh >= zoneHigh && x.zoneLow <= zoneLow)

    return result.length > 0;
}

/**
 * this function returns the count of candles that was in the range of given numbers
 * @param candles
 * @param minRange
 * @param maxRange
 * @returns
 */
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


/**
 * this function gives back the dynamic parameteres for the external api in this case forex
 * @param timeframe
 * @returns
 */
function getTimeRange(timeframe: TimeFrame): { tomorrow: string; daysAgo: string, timeTitle: string } {
    // Get current date
    const today = new Date();

    // Calculate tomorrow's date
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Calculate date 15 days ago
    let dayCount = timeframe == "3h" ? 15 : 1;
    const daysAgo = new Date(today);
    daysAgo.setDate(today.getDate() - dayCount);

    // Format date as YYYY-MM-DD
    const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    let timeTitle = timeframe.indexOf("m") > -1 ? "minute" : timeframe.indexOf("h") > -1 ? "hour" : "";

    return {
        timeTitle: timeTitle,
        tomorrow: formatDate(tomorrow),
        daysAgo: formatDate(daysAgo)
    };
}

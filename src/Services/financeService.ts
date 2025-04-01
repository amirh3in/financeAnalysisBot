import { Trade } from '@prisma/client';
import sendLog, { loginfo } from '../logger';
import { CandleResponse, Candlestick, OrderBlockVM, SignalTradeVM } from '../finance/types/types';
import { calculatePercentageChange, convert3hToDailyCandles, convert5mTo15mCandles, countCandlesInRange, formatData, tradableinAnyZone } from '../finance/util';
import { GetByOrderBlockStrategy } from '../finance/logic/algOrderBlock';
// import { FastifyInstance } from 'fastify';
import { baseService } from './base';
import * as dotenv from 'dotenv'
import { EStatus } from '../models/enums/EStatus';
import { EOrderType } from '../models/enums/EOrderType';
import { ESignalType } from '../models/enums/ESignalType';
import type { TimeFrame } from '../models/finance';
import { logTextFile } from '../logger/textLogger';
import { getBreakerBlocks } from '../finance/logic/breakers';

dotenv.config()

export class FinanceService extends baseService {

    private cache: Map<string, any> = new Map<string, any>();

    async addTrade(trade: Trade) {
        let limit = (trade.timeFrame == "3h" || trade.timeFrame == '1D') ? 6 : 4;


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
            const symbol = process.env.PAIR ?? "xauusd";

            let { result } = await this.runCheck(symbol, "3", '3h')
            result ??= [];

            await this.runCheck(symbol, "5", '5m', result)
            // await this.runCheck(symbol, "5", '5m', dailyRes)

        } catch (err: any) {
            loginfo("exeption job: " + JSON.stringify(err))
        }
    }

    async runCheck(symbol: string, interval: string, timeFrame: TimeFrame, upperTimeZones?: SignalTradeVM[], data?: Candlestick[]): Promise<{ result: SignalTradeVM[], dailyRes: SignalTradeVM[] }> {
        let sortedList: Candlestick[];
        let daily: SignalTradeVM[] = [];

        //#region api call
        if (!data && !this.cache.get(timeFrame)) {

            // getting dynamic parameters
            const { tomorrow, daysAgo, timeTitle } = getTimeRange(timeFrame)

            // fetching data
            let url = `https://api.finage.co.uk/agg/forex/${symbol}/${interval}/${timeTitle}/${daysAgo}/${tomorrow}/?apikey=${process.env.FOREX_API}`;
            var response = await fetch(url);
            if (response.status != 200) {
                await sendLog("error", `error from api: ${response.statusText}`)
                return { result: [], dailyRes: [] }
            }

            // formatting data and sort desc by timestamp
            var res: { results: CandleResponse[] } = await response.json();
            res.results.sort((a, b) => b.t - a.t);
            sortedList = formatData(res.results, symbol)


            // setting api call result to cache for rechecking performance and cost of api call
            this.cache.set(timeFrame, sortedList);


            //========= checking the upper timeframe since we can and the api call cost us
            if (timeFrame == "5m") {
                let convertedCandles = convert5mTo15mCandles(sortedList)

                await this.runCheck(symbol, '15', '15m', upperTimeZones, convertedCandles)
            }
            if (timeFrame == "3h") {

                let convertedCandles = convert3hToDailyCandles(sortedList);

                let { result } = await this.runCheck(symbol, '1', "1D", [], convertedCandles)
                daily = result;
            }//================================

        } else {
            if (data)
                sortedList = data
            else
                sortedList = this.cache.get(timeFrame)
        }
        //#endregion

        let idealRate = (timeFrame == "3h" || timeFrame == '1D') ? 0.10 : 0.03

        await this.checkBreakerBlocks(symbol, timeFrame, sortedList, idealRate, upperTimeZones);

        let result = await this.checkOrderBox(symbol, timeFrame, sortedList, idealRate, upperTimeZones);


        return { result: result, dailyRes: daily };
    }

    /**
     * this method is written by order block algorithm and it returns the nearby order blocks
     * @param symbol
     * @param timeFrame
     * @param sortedList
     * @param idealRate
     * @param upperTimeZones
     * @returns
     */
    async checkOrderBox(symbol: string, timeFrame: TimeFrame, sortedList: Candlestick[], idealRate: number, upperTimeZones?: SignalTradeVM[]) {
        let strategyRes = GetByOrderBlockStrategy(sortedList, idealRate);
        let result: SignalTradeVM[] = [];

        if (!process.env.DEV)
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

            if (timeFrame != '3h' && timeFrame != '1D' && !inBiggerZone)
                return;

            const currentPrice = sortedList[0].close
            // 2- if the price is bellow the zone, it should be sell signal. if the price was above, it should be buy signal
            isBuy = Math.abs(currentPrice - zoneHigh) < Math.abs(currentPrice - zoneLow)

            let change = 0;
            // 3- filter the closest to currentprice, each distance bellow 0.20% should be alarmed
            if (isBuy)
                change = calculatePercentageChange(currentPrice, zoneHigh)
            else
                change = calculatePercentageChange(currentPrice, zoneLow)

            // (currentPrice > zoneHigh || currentPrice < zoneLow) &&
            if (change <= ((timeFrame == "3h" || timeFrame == '1D') ? 0.70 : 0.20)) {// if the price was not in the zone

                let entry: number = 0,
                    sl: number = 0,
                    tp: number = 0,
                    signalDesc: string;


                // filtering zone that has less close candle. meaning the less candle closed in that range then the range is more valid
                let afterCandles = sortedList.filter(x => x.id < item.id);
                const { closeInRangeCount, passesThroughRangeCount } = countCandlesInRange(afterCandles, zoneLow, zoneHigh)
                if ((timeFrame == "5m" || timeFrame == "15m") && (closeInRangeCount > 6 || passesThroughRangeCount + closeInRangeCount > 5))
                    return
                else if ((timeFrame == "3h" || timeFrame == '1D') && (closeInRangeCount > 5 || passesThroughRangeCount + closeInRangeCount > 5))
                    return;



                // check if the timeframe is for support or trade
                if (timeFrame != '3h' && timeFrame != '1D') {// signal for trade

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
                    signalDesc = 'zone Discovered on ';
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
                    candleTimeStamp: String(item.timestamp),
                    liveTimeStamp: String(sortedList[0].timestamp),
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
                    await sendLog("Signal", `${signalDesc} ${symbol.toUpperCase()}\nTimeFrame: ${timeFrame}\nAlgorithm: ${newTrade.algoritm}\n\nEntry: ${entry}\nSL: ${sl}\nTP: ${tp}\n-------------------------\n\nzoneHigh: ${zoneHigh}\nzoneLow: ${zoneLow}\nvolume: ${item.volume}\nclosedInCount: ${closeInRangeCount}\nPassesThroughCount: ${passesThroughRangeCount} \n\n #${symbol} #${timeFrame} #${symbol}${timeFrame} #${newTrade.algoritm}`, item.time, this.fastify.telegramBot)

            }
        })


        return result;
    }

    /**
     * this method is written by breaker block and mitigation block both bearish and bullish scenario algorithm and it returns the result of the analyse
     * @param symbol
     * @param timeFrame
     * @param data
     * @param idealRate
     * @param upperTimeZones
     * @returns
     */
    async checkBreakerBlocks(symbol: string, timeFrame: TimeFrame, data: Candlestick[], idealRate: number, upperTimeZones?: SignalTradeVM[]) {

        let strategieRes = getBreakerBlocks(data)
        let result: SignalTradeVM[] = [];

        let isBuy: boolean;
        const currentPrice = data[0].close

        strategieRes.forEach(async (item) => {
            const zoneHigh = item.zoneHigh ?? 0,
                zoneLow = item.zoneLow ?? 0;
            isBuy = Math.abs(currentPrice - zoneHigh) < Math.abs(currentPrice - zoneLow)

            let change = 0;

            // 2- filter the closest to currentprice, each distance bellow 0.20% should be alarmed
            if (isBuy)
                change = calculatePercentageChange(currentPrice, zoneHigh)
            else
                change = calculatePercentageChange(currentPrice, zoneLow)

            // 3- if the price is bellow the zone, it should be sell signal. if the price was above, it should be buy signal
            // (currentPrice > zoneHigh || currentPrice < zoneLow) &&
            if (change <= ((timeFrame == "3h" || timeFrame == '1D') ? 0.70 : 0.20)) {
                let entry: number = 0,
                    sl: number = 0,
                    tp: number = 0,
                    signalDesc: string,
                    inBiggerZone = false;

                if (upperTimeZones && upperTimeZones?.length != 0)
                    inBiggerZone = tradableinAnyZone(zoneLow, zoneHigh, upperTimeZones)

                if (timeFrame != '3h' && timeFrame != '1D' && !inBiggerZone)
                    return;

                // filtering zone that has less close candle. meaning the less candle closed in that range then the range is more valid
                let afterCandles = data.filter(x => x.id < item.candlestick.id);
                const { closeInRangeCount, passesThroughRangeCount } = countCandlesInRange(afterCandles, zoneLow, zoneHigh)
                if ((timeFrame == "5m" || timeFrame == "15m") && (closeInRangeCount > 1 || passesThroughRangeCount + closeInRangeCount > 2))
                    return
                else if ((timeFrame == "3h" || timeFrame == '1D') && (closeInRangeCount > 1 || passesThroughRangeCount + closeInRangeCount > 2))
                    return;


                // check if the timeframe is for support or trade
                if (timeFrame != '3h' && timeFrame != '1D') {// signal for trade

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
                    signalDesc = 'zone Discovered on ';
                }

                //@ts-ignore
                let newTrade: Trade = {
                    pair: symbol,
                    algoritm: item.type,
                    tp: tp,
                    sl: sl,
                    candleTime: item.candlestick.time,
                    candleInfo: JSON.stringify(item),
                    volume: item.candlestick.volume,
                    signalType: ESignalType.TRADE,
                    candleTimeStamp: String(item.candlestick.timestamp),
                    liveTimeStamp: String(data[0].timestamp),
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
                    await sendLog("Signal", `${signalDesc} ${symbol.toUpperCase()}\nTimeFrame: ${timeFrame}\nAlgorithm: ${newTrade.algoritm}\n\nEntry: ${entry}\nSL: ${sl}\nTP: ${tp}\n-------------------------\n\nzoneHigh: ${zoneHigh}\nzoneLow: ${zoneLow}\nvolume: ${item.candlestick.volume}\nclosedInCount: ${closeInRangeCount}\nPassesThroughCount: ${passesThroughRangeCount} \n\n #${symbol} #${timeFrame} #${symbol}${timeFrame} #${newTrade.algoritm}`, item.candlestick.time, this.fastify.telegramBot)
            }
        })

        return result;
    }
}


//#region  Helper methods and functions


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
    let dayCount = timeframe == "3h" ? 68 : 3;
    const daysAgo = new Date(today);
    daysAgo.setDate(today.getDate() - dayCount);

    // Format date as YYYY-MM-DD
    const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    let timeTitle = timeframe.indexOf("m") > -1 ? "minute" : timeframe.indexOf("h") > -1 ? "hour" : timeframe.indexOf("D") > -1 ? "Day" : "";

    return {
        timeTitle: timeTitle,
        tomorrow: formatDate(tomorrow),
        daysAgo: formatDate(daysAgo)
    };
}


//#endregion

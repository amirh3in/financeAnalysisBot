import { Candlestick, OrderBlockVM } from "./types";

/**
 * this function check candles having conditions for being order block candles with given alghoritm
 * @param data
 * @param idealRate
 * @returns
 */
export function GetByOrderBlockStrategy(data: Candlestick[], idealRate: number = 0.10): OrderBlockVM[] {
    let list = Array.from(data);

    // let test = findSwingBases(data).filter(x => x.type == "low").map(x => x.candlestick);
    // list.forEach((candle, index) => {
    //     checkCandle(list, candle)
    // });

    let result = list.map(x => checkCandle(list, x, idealRate))
        .filter(x => x != null);

    return result;
}
function findSwingBases(candlesticks: Candlestick[]) {
    const swingBases = [];

    for (let i = 1; i < candlesticks.length - 1; i++) {
        const prev = candlesticks[i + 1];
        // const prev2 = candlesticks[i + 2];
        const current = candlesticks[i];
        const next = candlesticks[i - 1];

        // Check for local minima (base of a swing low)
        if (current.low < prev.low && current.low < next.low) {
            swingBases.push({ type: 'low', candlestick: current });
        }

        // Check for local maxima (base of a swing high)
        if (current.high > prev.high && current.high > next.high) {
            swingBases.push({ type: 'high', candlestick: current });
        }
    }

    return swingBases;
}

/**
 * this function check each candle that has condition for being order block candle with given alghoritm
 * @param list
 * @param candle
 * @param idealRate
 * @returns
 */
const checkCandle = (list: Candlestick[], candle: Candlestick, idealRate: number): OrderBlockVM | null => {

    // const positionDown = candle.down;
    let change = (Math.abs(candle.open - candle.close) / candle.close) * 100;
    // let result = [];
    // if the candle has primary conditions then..
    if (candle.down && change > idealRate) {

        let next10Above = false,
            lastMomentom = true,
            hasBaseCandle;

        const limit = Math.abs(Number(candle.id - 7 >= 0 ? candle.id - 7 : 0));
        let nearbyCount = 3;
        // go check next 10 candles and if there was not 10 candles then get untill the 0 index
        for (let i = candle.id - 2; i >= limit; i--) {
            let thisCandle = list[i];

            // check if any next candles is bellow current momentom candle
            // ///////////////////////////// up    ///////////////////
            // if (((positionDown && thisCandle.open < candle.close) || (!positionDown && thisCandle.open > candle.close)) && nearbyCount > 0)
            //     lastMomentom = false;
            if ((thisCandle.open < candle.close) && nearbyCount > 0)
                lastMomentom = false;

            nearbyCount--;
            // check if any next 10 candles are going above this price or not
            // ////////////////////////////////////// bellow this price or not
            // if ((positionDown && thisCandle.close > candle.open) || (!positionDown && thisCandle.close < candle.close))
            //     next10Above = true;
            if (thisCandle.close > candle.open)
                next10Above = true;


            if (thisCandle.isBase && thisCandle.down && !next10Above)
                hasBaseCandle = thisCandle
        }

        if (next10Above && lastMomentom)
            return {
                ...candle,
                baseHigh: hasBaseCandle ? hasBaseCandle.high : null,
                baseLow: hasBaseCandle ? hasBaseCandle.low : null,
                rangeHigh: Math.min(candle.open, list[candle.id - 2].close),
                rangeLow: Math.min(candle.low, list[candle.id - 2].low),
                baseTime: hasBaseCandle ? hasBaseCandle.time : null
                // position: positionDown ? 'down' : 'up'
            };
    }

    return null
}

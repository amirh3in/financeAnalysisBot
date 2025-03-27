import { CandleResponse, Candlestick } from "./types";

function isMomentom(candle: CandleResponse) {
    if (candle.o < candle.c) {
        const upShadow = Math.abs(candle.h - candle.c)
        const downShadow = Math.abs(candle.l - candle.o)
        const body = Math.abs(candle.c - candle.o);
        let changes = (Math.abs(candle.c - candle.o) / candle.o) * 100;

        if (body > upShadow + downShadow && changes > 0.10)
            return true;
        else
            return false;
    } else {
        const upShadow = Math.abs(candle.h - candle.o)
        const downShadow = Math.abs(candle.l - candle.c)
        const body = Math.abs(candle.o - candle.c);
        let changes = (Math.abs(candle.o - candle.c) / candle.c) * 100;

        if (body > upShadow + downShadow && changes > 0.10)
            return true;
        else
            return false;
    }

}

export function isMomentomCrypto(candle: Candlestick) {
    if (candle.open < candle.close) {
        const upShadow = Math.abs(candle.high - candle.close)
        const downShadow = Math.abs(candle.low - candle.open)
        const body = Math.abs(candle.close - candle.open);

        if (body > upShadow + downShadow)
            return true;
        else
            return false;
    } else {
        const upShadow = Math.abs(candle.high - candle.open)
        const downShadow = Math.abs(candle.low - candle.close)
        const body = Math.abs(candle.open - candle.close);

        if (body > upShadow + downShadow)
            return true;
        else
            return false;
    }

}

export function isBase(candle: CandleResponse, id: number) {

    let body = Math.abs(candle.o - candle.c);
    let total = Math.abs(candle.l - candle.h);
    let diff = (body / total) * 100;

    return diff < 50
}

export function formatData(result: CandleResponse[], symbol: string) {

    let list: CandleResponse[] = result;

    let finalList: Candlestick[] = [];
    list.forEach((item, index) => {
        // time calculate
        const readableTime = convertTimestampToReadableDate(item.t); // Get a readable string based on your locale

        finalList.push({
            id: ++index,
            low: item.l,
            high: item.h,
            volume: item.v,
            time: readableTime,
            timestamp: item.t,
            open: item.o,
            close: item.c,
            // pair_id: item.pair_id,
            pair: symbol,
            up: item.o < item.c,
            down: item.o > item.c,
            momentom: isMomentom(item),
            isBase: isBase(item, index)
        })
    });

    return finalList;

}

/**
 * this function returns the distance percentage of two prices
 * @param originalPrice
 * @param newPrice
 * @returns
 */
export function calculatePercentageChange(originalPrice: number, newPrice: number): number {
    const difference = newPrice - originalPrice;
    const percentageChange = (difference / originalPrice) * 100;
    return Math.abs(percentageChange);
}

function convertTimestampToReadableDate(timestamp: number) {
    const date = new Date(timestamp);
    return date.toLocaleString(); // Converts to a readable format based on your locale
}


export function convert5mTo15mCandles(candles5m: Candlestick[]): Candlestick[] {
    if (candles5m.length === 0) return [];

    // Sort candles by timestamp in ascending order (oldest first)
    const sortedCandles = [...candles5m].sort((a, b) => a.timestamp - b.timestamp);

    const candles15m: Candlestick[] = [];
    let currentGroup: Candlestick[] = [];
    let currentGroupStartTime: number | null = null;

    for (const candle of sortedCandles) {
        const candleTime = candle.timestamp;
        const roundedTime = Math.floor(candleTime / (15 * 60 * 1000)) * (15 * 60 * 1000);

        // If we're starting a new group or the candle belongs to the current group
        if (currentGroupStartTime === null || roundedTime === currentGroupStartTime) {
            currentGroup.push(candle);
            currentGroupStartTime = roundedTime;
        } else {
            // Process the completed group
            if (currentGroup.length > 0) {
                candles15m.push(create15mCandle(currentGroup, currentGroupStartTime));
            }

            // Start a new group
            currentGroup = [candle];
            currentGroupStartTime = roundedTime;
        }
    }

    // Process the last group if it exists
    if (currentGroup.length > 0) {
        candles15m.push(create15mCandle(currentGroup, currentGroupStartTime!));
    }

    // Return in descending order (newest first) to match input format
    return candles15m.reverse();
}

function create15mCandle(group: Candlestick[], groupStartTime: number): Candlestick {
    const firstCandle = group[0];
    const lastCandle = group[group.length - 1];

    // Calculate aggregated values
    const open = firstCandle.open;
    const close = lastCandle.close;
    const high = Math.max(...group.map(c => c.high));
    const low = Math.min(...group.map(c => c.low));
    const volume = group.reduce((sum, c) => sum + c.volume, 0);

    // Create the 15m candle
    return {
        id: lastCandle.id, // Using last candle's ID
        low,
        high,
        volume,
        time: convertTimestampToReadableDate(groupStartTime), // Using the rounded time
        timestamp: groupStartTime,
        open,
        close,
        pair: firstCandle.pair,
        up: close > open,
        down: close < open,
        momentom: false, // You might want to calculate this differently
        isBase: group.some(c => c.isBase),
    };
}

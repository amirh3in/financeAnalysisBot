
import { BreakerBlock, Candlestick, FindSwingBasesResult } from "../types/types";

export const getBreakerBlocks = (data: Candlestick[]): BreakerBlock[] => {
    const breakerBlocks: BreakerBlock[] = [];
    // const swings = findSwingBases(data);
    const swings = findSwingBases2(data);

    if (swings.length < 4) return breakerBlocks;

    for (let i = 2; i < swings.length - 1; i++) {
        const currentSwing = swings[i];  // Current swing (potential breaker)
        const nextSwing = swings[i - 1];
        const nextSameSwing = swings[i - 2];
        const previousSwing = swings[i + 1];
        const prevSameSwing = swings[i + 2];
        const prevOfThatprevSameSwing = swings[i + 3]


        //#region BREAKER ALGORITHM
        // bullish breaker
        if (
            previousSwing.type === "low" &&
            currentSwing.type === "high" &&
            nextSwing.type === "low" &&
            nextSameSwing.type === 'high' &&
            previousSwing.candlestick.low > nextSwing.candlestick.high &&
            nextSameSwing.candlestick.high > currentSwing.candlestick.high
        ) {
            breakerBlocks.push({
                candlestick: currentSwing.candlestick,
                type: "breaker bearish",
            });
        }


        // bearish breaker
        if (
            previousSwing.type === "high" &&
            currentSwing.type === "low" &&
            nextSwing.type === "high" &&
            nextSameSwing.type === 'low' &&
            previousSwing.candlestick.high < nextSwing.candlestick.high &&
            nextSameSwing.candlestick.low < currentSwing.candlestick.low
        ) {
            breakerBlocks.push({
                candlestick: currentSwing.candlestick,
                type: "breaker bearish",
            });
        }

        //#endregion


        //#region  MITIGATION BLOCKS
        // mitigation breaker
        if (
            previousSwing.type === "high" &&
            currentSwing.type === "low" &&
            nextSwing.type === "high" &&
            nextSameSwing.type === 'low' &&
            prevSameSwing.type === "low" &&
            prevOfThatprevSameSwing.type == 'high' &&
            previousSwing.candlestick.high > prevOfThatprevSameSwing.candlestick.high &&
            previousSwing.candlestick.high > nextSwing.candlestick.high &&
            nextSameSwing.candlestick.low < currentSwing.candlestick.low
        ) {
            breakerBlocks.push({
                candlestick: currentSwing.candlestick,
                type: "mitigation bearish",
            });
        }

        if (
            previousSwing.type === "low" &&
            currentSwing.type === "high" &&
            nextSwing.type === "low" &&
            nextSameSwing.type === 'high' &&
            prevSameSwing.type === "high" &&
            prevOfThatprevSameSwing.type == 'low' &&
            previousSwing.candlestick.low < prevOfThatprevSameSwing.candlestick.low &&
            previousSwing.candlestick.low < nextSwing.candlestick.low &&
            nextSameSwing.candlestick.high > currentSwing.candlestick.high
        ) {
            breakerBlocks.push({
                candlestick: currentSwing.candlestick,
                type: "mitigation bullish",
            });
        }
        //#endregion
    }


    return breakerBlocks;
};

const findSwingBases = (candlesticks: Candlestick[]): FindSwingBasesResult[] => {
    const swingBases: FindSwingBasesResult[] = [];

    for (let i = 1; i < candlesticks.length - 1; i++) {
        const prev = candlesticks[i + 1];
        const prev2 = candlesticks[i + 2];
        const prev3 = candlesticks[i + 3];
        const prev4 = candlesticks[i + 4];
        // const prev2 = candlesticks[i + 2];
        const current = candlesticks[i];
        const next = candlesticks[i - 1];
        const next2 = candlesticks[i - 2];
        const next3 = candlesticks[i - 3];
        const next4 = candlesticks[i - 4];
        // const next3 = candlesticks[i - 3];

        // Check for local minima (base of a swing low)
        if (
            current.low < prev.low
            && (prev2 && current.low < prev2.low)
            && (prev3 && current.low < prev3.low)
            && (prev4 && current.low < prev4.low)
            && current.low < next.low || !next
            && ((next2 && current.low < next2.low) || !next2)
            && ((next3 && current.low < next3.low) || !next3)
            && ((next4 && current.low < next4.low) || !next4)
        ) {

            let nextcount = 0,
                prevcount = 0;

            if (next.low < next2.low)
                nextcount++;
            if (next2.low < next3.low)
                nextcount++;
            if (next3.low < next4.low)
                nextcount++;

            if (prev.low < prev2.low)
                prevcount++;
            if (prev2.low < prev3.low)
                prevcount++;
            if (prev3.low < prev4.low)
                prevcount++;


            if (nextcount >= 2 && prevcount >= 2)
                // check for precentage change. i think 0.05 is enough


                swingBases.push({ type: 'low', candlestick: current, index: i });
        }

        // Check for local maxima (base of a swing high)
        if (
            current.high > prev.high
            && (prev2 && current.high > prev2.high)
            && (prev3 && current.high > prev3.high)
            && (prev4 && current.high > prev4.high)
            && current.high > next.high || !next
            && ((next2 && current.high > next2.high) || !next2)
            && ((next3 && current.high > next3.high) || !next3)
            && ((next4 && current.high > next4.high) || !next4)

        ) {
            swingBases.push({ type: 'high', candlestick: current, index: i });
        }
    }

    return swingBases;
}


const findSwingBases2 = (candlesticks: Candlestick[]): FindSwingBasesResult[] => {
    const swingBases: FindSwingBasesResult[] = [];
    const minSwingDistance = 3; // Minimum candles between swings (adjust based on timeframe)

    if (candlesticks.length < 5) return swingBases;

    // First pass: Identify all potential swings
    const potentialSwings: FindSwingBasesResult[] = [];
    for (let i = 2; i < candlesticks.length - 2; i++) {
        const current = candlesticks[i];
        const prev1 = candlesticks[i + 1];
        const prev2 = candlesticks[i + 2];
        const next1 = candlesticks[i - 1];
        const next2 = candlesticks[i - 2];

        // Swing high detection
        if (current.high > Math.max(prev1.high, prev2.high, next1.high, next2.high)) {
            potentialSwings.push({ type: 'high', candlestick: current, index: i });
        }
        // Swing low detection
        else if (current.low < Math.min(prev1.low, prev2.low, next1.low, next2.low)) {
            potentialSwings.push({ type: 'low', candlestick: current, index: i });
        }
    }

    // Second pass: Filter out clustered swings
    for (let i = 0; i < potentialSwings.length; i++) {
        const current = potentialSwings[i];
        let isValid = true;

        // Check previous swings
        if (i > 0) {
            const prevSwing = potentialSwings[i - 1];
            const candlesBetween = current.index - prevSwing.index;

            // Reject if swings are too close
            if (candlesBetween < minSwingDistance) {
                // Keep the more significant swing (higher high or lower low)
                if (current.type === 'high' && current.candlestick.high > prevSwing.candlestick.high) {
                    swingBases.pop(); // Remove the previous, less significant swing
                } else if (current.type === 'low' && current.candlestick.low < prevSwing.candlestick.low) {
                    swingBases.pop(); // Remove the previous, less significant swing
                } else {
                    isValid = false;
                }
            }
        }

        if (isValid) {
            swingBases.push(current);
        }
    }

    return swingBases;
};

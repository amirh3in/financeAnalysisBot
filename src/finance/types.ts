export type CandleResponse = {
    l: number;
    h: number;
    v: number;
    t: number;
    o: number;
    c: number;
}
export type Candlestick = {
    id: number;
    low: number;
    high: number;
    volume: number;
    time: string;
    timestamp: number;
    open: number;
    close: number;
    pair: string;
    up: boolean;
    down: boolean;
    momentom: boolean;
    isBase: boolean;
}


export type OrderBlockVM = Candlestick & {
    baseHigh: number | null;
    baseLow: number | null;
    rangeHigh: number;
    rangeLow: number;
    baseTime: string | null;
}

export type SignalVM = OrderBlockVM & {
    tp: number;
    price: number;
    sl: number;
}

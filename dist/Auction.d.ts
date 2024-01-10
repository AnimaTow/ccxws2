export declare class Auction {
    readonly exchange: string;
    readonly quote: string;
    readonly base: string;
    readonly tradeId: string;
    readonly unixTimestamp: number;
    readonly price: string;
    readonly high: string;
    readonly low: string;
    readonly amount: string;
    constructor({ exchange, base, quote, tradeId, unixTimestamp, price, amount, high, low, }: Partial<Auction>);
    get marketId(): string;
    /**
     * @deprecated use Market object (second argument to each event) to determine exchange and trade pair
     */
    get fullId(): string;
}

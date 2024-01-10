export class Auction {
    public readonly exchange: string;
    public readonly quote: string;
    public readonly base: string;
    public readonly tradeId: string;
    public readonly unixTimestamp: number;
    public readonly price: string;
    public readonly high: string;
    public readonly low: string;
    public readonly amount: string;

    constructor({
        exchange,
        base,
        quote,
        tradeId,
        unixTimestamp,
        price,
        amount,
        high,
        low,
    }: Partial<Auction>) {
        this.exchange = exchange || "";
        this.quote = quote || "";
        this.base = base || "";
        this.tradeId = tradeId || "";
        this.unixTimestamp = unixTimestamp || 0;
        this.price = price || "";
        this.high = high || "";
        this.low = low || "";
        this.amount = amount || "";
    }

    public get marketId() {
        return `${this.base}/${this.quote}`;
    }

    /**
     * @deprecated use Market object (second argument to each event) to determine exchange and trade pair
     */
    public get fullId() {
        return `${this.exchange}:${this.base}/${this.quote}`;
    }
}

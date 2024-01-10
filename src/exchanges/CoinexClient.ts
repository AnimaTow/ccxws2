/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-implied-eval */
import moment = require("moment");
import { BasicClient } from "../BasicClient";
import { BasicMultiClient } from "../BasicMultiClient";
import { CandlePeriod } from "../CandlePeriod";
import { IClient } from "../IClient";
import { Level2Point } from "../Level2Point";
import { Level2Snapshot } from "../Level2Snapshots";
import { Level2Update } from "../Level2Update";
import { NotImplementedFn } from "../NotImplementedFn";
import { SubscriptionType } from "../SubscriptionType";
import { Ticker } from "../Ticker";
import { Trade } from "../Trade";
import * as crypto from "crypto-js";

export type CoinexClientOptions = {
    apiKey?: string;
    apiSecret?: string;
};

export class CoinexClient extends BasicMultiClient {
    public options: CoinexClientOptions;
    public candlePeriod: CandlePeriod;

    constructor(options: CoinexClientOptions = {}) {
        super();
        this.options = options;
        this.hasTickers = true;
        this.hasTrades = true;
        this.hasCandles = false;
        this.hasLevel2Updates = true;
        this.candlePeriod = CandlePeriod._1m;
    }

    protected _createBasicClient(): IClient {
        const { apiKey, apiSecret } = this.options;
        return new CoinexSingleClient({ ...this.options, apiKey, apiSecret, parent: this });
    }
}

export class CoinexSingleClient extends BasicClient {
    public retryErrorTimeout: number;
    public parent: CoinexClient;
    public apiKey: string | undefined; // Declare apiKey as a class property
    public apiSecret: string | undefined; // Declare apiSecret as a class property

    protected _id: number;
    protected _idSubMap: Map<any, any>;
    protected _pingInterval: NodeJS.Timeout | null = null;

    constructor({
        wssPath = "wss://socket.coinex.com/",
        watcherMs = 900 * 1000,
        parent,
        apiKey,
        apiSecret,
    }) {
        super(wssPath, "Coinex", undefined, watcherMs);
        this.hasTickers = true;
        this.hasTrades = true;
        this.hasCandles = false;
        this.hasLevel2Updates = true;
        this.retryErrorTimeout = 15000;
        this._id = 0;
        this._idSubMap = new Map();
        this.parent = parent;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
    }

    private _generateSignature(accessId: string, secretKey: string, tonce: number): string {
        if (!accessId || !secretKey) {
            throw new Error("API key and API secret are required for authentication.");
        }

        const signData = `access_id=${accessId}&tonce=${tonce}&secret_key=${secretKey}`;
        return crypto.MD5(signData).toString().toUpperCase();
    }

    private _authenticate(): void {
        const { apiKey, apiSecret } = this;
        if (!apiKey || !apiSecret) {
            throw new Error("API key and API secret are required for authentication.");
        }

        const tonce = Date.now();
        const signature = this._generateSignature(apiKey, apiSecret, tonce);

        this._wss.send(
            JSON.stringify({
                method: "server.sign",
                params: [apiKey, signature, tonce],
                id: ++this._id,
            }),
        );
    }

    public get candlePeriod() {
        return this.parent.candlePeriod;
    }

    protected _beforeConnect() {
        this._wss.on("connected", () => {
            this._startPing();
            this._authenticate();
        });
        this._wss.on("disconnected", this._stopPing.bind(this));
        this._wss.on("closed", this._stopPing.bind(this));
    }

    protected _startPing() {
        if (this._pingInterval) {
            clearInterval(this._pingInterval as any);
        }
        this._pingInterval = setInterval(this._sendPing.bind(this), 30000) as any;
    }

    protected _stopPing() {
        if (this._pingInterval) {
            clearInterval(this._pingInterval as any);
            this._pingInterval = null;
        }
    }

    protected _sendPing() {
        if (this._wss) {
            this._wss.send(
                JSON.stringify({
                    method: "server.ping",
                    params: [],
                    id: ++this._id,
                }),
            );
        }
    }

    protected _failSubscription(id) {
        // find the subscription
        const sub = this._idSubMap.get(id);
        if (!sub) return;

        // // unsubscribe from the appropriate event
        // const { type, remote_id } = sub;

        // // unsubscribe from the appropriate thiing
        // switch (type) {
        //     case SubscriptionType.ticker:
        //         this.unsubscribeTicker(remote_id);
        //         break;
        //     case SubscriptionType.trade:
        //         this.unsubscribeTrades(remote_id);
        //         break;
        //     case SubscriptionType.level2update:
        //         this.unsubscribeLevel2Updates(remote_id);
        //         break;
        // }

        // remove the value
        this._idSubMap.delete(id);
    }

    // unsubscribeTicker(remote_id: any) {
    //     throw new Error("Method not implemented.");
    // }
    // unsubscribeTrades(remote_id: any) {
    //     throw new Error("Method not implemented.");
    // }
    // unsubscribeLevel2Updates(remote_id: any) {
    //     throw new Error("Method not implemented.");
    // }

    protected _sendSubTicker(remote_id) {
        const id = this._id++;
        this._idSubMap.set(id, { remote_id, type: SubscriptionType.ticker });
        this._wss.send(
            JSON.stringify({
                method: "state.subscribe",
                params: [remote_id],
                id,
            }),
        );
    }

    protected _sendUnsubTicker() {
        this._wss.send(
            JSON.stringify({
                method: "state.unsubscribe",
            }),
        );
    }

    protected _sendSubTrades(remote_id) {
        const id = this._id++;
        this._idSubMap.set(id, { remote_id, type: SubscriptionType.trade });
        this._wss.send(
            JSON.stringify({
                method: "deals.subscribe",
                params: [remote_id],
                id,
            }),
        );
    }

    protected _sendUnsubTrades() {
        this._wss.send(
            JSON.stringify({
                method: "deals.unsubscribe",
            }),
        );
    }

    protected _sendSubLevel2Updates(remote_id) {
        const id = this._id++;
        this._idSubMap.set(id, { remote_id, type: SubscriptionType.level2update });
        this._wss.send(
            JSON.stringify({
                method: "depth.subscribe",
                params: [remote_id, 50, "0"],
                id,
            }),
        );
    }

    protected _sendUnsubLevel2Updates() {
        this._wss.send(
            JSON.stringify({
                method: "depth.unsubscribe",
            }),
        );
    }

    protected _sendSubCandles = NotImplementedFn;
    protected _sendUnsubCandles = NotImplementedFn;
    protected _sendSubLevel2Snapshots = NotImplementedFn;
    protected _sendUnsubLevel2Snapshots = NotImplementedFn;
    protected _sendSubLevel3Snapshots = NotImplementedFn;
    protected _sendUnsubLevel3Snapshots = NotImplementedFn;
    protected _sendSubLevel3Updates = NotImplementedFn;
    protected _sendUnsubLevel3Updates = NotImplementedFn;

    protected _onMessage(raw) {
        const msg = JSON.parse(raw);

        const { error, method, params, id } = msg;

        // unsubscribe on failures
        if (error) {
            this.emit("error", msg);
            this._failSubscription(id);
            return;
        }

        // if params is not defined, then this is a response to an event
        // that we don't care about (like the initial connection event)
        if (!params) return;

        if (method === "state.update") {
            const marketId = Object.keys(params[0])[0];
            const market = this._tickerSubs.get(marketId);
            if (!market) return;

            const ticker = this._constructTicker(params[0][marketId], market);
            this.emit("ticker", ticker, market);
            return;
        }

        if (method === "deals.update") {
            const marketId = params[0];
            const market = this._tradeSubs.get(marketId);
            if (!market) return;

            for (const t of params[1].reverse()) {
                const trade = this._constructTrade(t, market);
                this.emit("trade", trade, market);
            }
            return;
        }

        if (method === "depth.update") {
            const marketId = params[2];
            const market = this._level2UpdateSubs.get(marketId);
            if (!market) return;

            const isLevel2Snapshot = params[0];
            if (isLevel2Snapshot) {
                const l2snapshot = this._constructLevel2Snapshot(params[1], market);
                this.emit("l2snapshot", l2snapshot, market);
            } else {
                const l2update = this._constructLevel2Update(params[1], market);
                this.emit("l2update", l2update, market);
            }
            return;
        }
    }

    protected _constructTicker(rawTick, market) {
        let { last, open, high, low, volume, deal } = rawTick,
            change = parseFloat(last) - parseFloat(open),
            changePercent = ((parseFloat(last) - parseFloat(open)) / parseFloat(open)) * 100;

        return new Ticker({
            exchange: "Coinex",
            base: market.base,
            quote: market.quote,
            timestamp: Date.now(),
            last: last,
            open: open,
            high: high,
            low: low,
            volume: volume,
            quoteVolume: deal,
            change: change.toFixed(8),
            changePercent: changePercent.toFixed(8),
        });
    }

    protected _constructTrade(rawTrade, market) {
        const { id, time, type, price, amount } = rawTrade;

        const unix = moment.utc(time * 1000).valueOf();

        return new Trade({
            exchange: this.name,
            base: market.base,
            quote: market.quote,
            tradeId: id.toFixed(),
            unix: unix,
            side: type,
            price,
            amount,
            buyOrderId: undefined,
            sellOrderId: undefined,
        });
    }

    protected _constructLevel2Snapshot(rawUpdate, market) {
        let { bids, asks } = rawUpdate,
            structuredBids = bids ? bids.map(([price, size]) => new Level2Point(price, size)) : [],
            structuredAsks = asks ? asks.map(([price, size]) => new Level2Point(price, size)) : [];

        return new Level2Snapshot({
            exchange: this.name,
            base: market.base,
            quote: market.quote,
            bids: structuredBids,
            asks: structuredAsks,
        });
    }

    protected _constructLevel2Update(rawUpdate, market) {
        let { bids, asks } = rawUpdate,
            structuredBids = bids ? bids.map(([price, size]) => new Level2Point(price, size)) : [],
            structuredAsks = asks ? asks.map(([price, size]) => new Level2Point(price, size)) : [];

        return new Level2Update({
            exchange: this.name,
            base: market.base,
            quote: market.quote,
            bids: structuredBids,
            asks: structuredAsks,
        });
    }
}

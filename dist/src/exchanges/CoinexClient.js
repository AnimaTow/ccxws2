"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinexSingleClient = exports.CoinexClient = void 0;
/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-implied-eval */
const moment = require("moment");
const BasicClient_1 = require("../BasicClient");
const BasicMultiClient_1 = require("../BasicMultiClient");
const CandlePeriod_1 = require("../CandlePeriod");
const Level2Point_1 = require("../Level2Point");
const Level2Snapshots_1 = require("../Level2Snapshots");
const Level2Update_1 = require("../Level2Update");
const NotImplementedFn_1 = require("../NotImplementedFn");
const SubscriptionType_1 = require("../SubscriptionType");
const Ticker_1 = require("../Ticker");
const Trade_1 = require("../Trade");
const crypto = __importStar(require("crypto-js"));
class CoinexClient extends BasicMultiClient_1.BasicMultiClient {
    constructor(options = {}) {
        super();
        this.options = options;
        this.hasTickers = true;
        this.hasTrades = true;
        this.hasCandles = false;
        this.hasLevel2Updates = true;
        this.candlePeriod = CandlePeriod_1.CandlePeriod._1m;
    }
    _createBasicClient() {
        const { apiKey, apiSecret } = this.options;
        return new CoinexSingleClient({ ...this.options, apiKey, apiSecret, parent: this });
    }
}
exports.CoinexClient = CoinexClient;
class CoinexSingleClient extends BasicClient_1.BasicClient {
    constructor({ wssPath = "wss://socket.coinex.com/", watcherMs = 900 * 1000, parent, apiKey, apiSecret }) {
        super(wssPath, "Coinex", undefined, watcherMs);
        this._pingInterval = null;
        this._sendSubCandles = NotImplementedFn_1.NotImplementedFn;
        this._sendUnsubCandles = NotImplementedFn_1.NotImplementedFn;
        this._sendSubLevel2Snapshots = NotImplementedFn_1.NotImplementedFn;
        this._sendUnsubLevel2Snapshots = NotImplementedFn_1.NotImplementedFn;
        this._sendSubLevel3Snapshots = NotImplementedFn_1.NotImplementedFn;
        this._sendUnsubLevel3Snapshots = NotImplementedFn_1.NotImplementedFn;
        this._sendSubLevel3Updates = NotImplementedFn_1.NotImplementedFn;
        this._sendUnsubLevel3Updates = NotImplementedFn_1.NotImplementedFn;
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
    _generateSignature(accessId, secretKey, tonce) {
        if (!accessId || !secretKey) {
            throw new Error("API key and API secret are required for authentication.");
        }
        const signData = `access_id=${accessId}&tonce=${tonce}&secret_key=${secretKey}`;
        return crypto.MD5(signData).toString().toUpperCase();
    }
    _authenticate() {
        const { apiKey, apiSecret } = this;
        if (!apiKey || !apiSecret) {
            throw new Error("API key and API secret are required for authentication.");
        }
        const tonce = Date.now();
        const signature = this._generateSignature(apiKey, apiSecret, tonce);
        this._wss.send(JSON.stringify({
            method: "server.sign",
            params: [apiKey, signature, tonce],
            id: ++this._id,
        }));
    }
    get candlePeriod() {
        return this.parent.candlePeriod;
    }
    _beforeConnect() {
        this._wss.on("connected", () => {
            this._startPing();
            this._authenticate();
        });
        this._wss.on("disconnected", this._stopPing.bind(this));
        this._wss.on("closed", this._stopPing.bind(this));
    }
    _startPing() {
        if (this._pingInterval) {
            clearInterval(this._pingInterval);
        }
        this._pingInterval = setInterval(this._sendPing.bind(this), 30000);
    }
    _stopPing() {
        if (this._pingInterval) {
            clearInterval(this._pingInterval);
            this._pingInterval = null;
        }
    }
    _sendPing() {
        if (this._wss) {
            this._wss.send(JSON.stringify({
                method: "server.ping",
                params: [],
                id: ++this._id,
            }));
        }
    }
    _failSubscription(id) {
        // find the subscription
        const sub = this._idSubMap.get(id);
        if (!sub)
            return;
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
    _sendSubTicker(remote_id) {
        const id = this._id++;
        this._idSubMap.set(id, { remote_id, type: SubscriptionType_1.SubscriptionType.ticker });
        this._wss.send(JSON.stringify({
            method: "state.subscribe",
            params: [remote_id],
            id,
        }));
    }
    _sendUnsubTicker() {
        this._wss.send(JSON.stringify({
            method: "state.unsubscribe",
        }));
    }
    _sendSubTrades(remote_id) {
        const id = this._id++;
        this._idSubMap.set(id, { remote_id, type: SubscriptionType_1.SubscriptionType.trade });
        this._wss.send(JSON.stringify({
            method: "deals.subscribe",
            params: [remote_id],
            id,
        }));
    }
    _sendUnsubTrades() {
        this._wss.send(JSON.stringify({
            method: "deals.unsubscribe",
        }));
    }
    _sendSubLevel2Updates(remote_id) {
        const id = this._id++;
        this._idSubMap.set(id, { remote_id, type: SubscriptionType_1.SubscriptionType.level2update });
        this._wss.send(JSON.stringify({
            method: "depth.subscribe",
            params: [remote_id, 50, "0"],
            id,
        }));
    }
    _sendUnsubLevel2Updates() {
        this._wss.send(JSON.stringify({
            method: "depth.unsubscribe",
        }));
    }
    _onMessage(raw) {
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
        if (!params)
            return;
        if (method === "state.update") {
            const marketId = Object.keys(params[0])[0];
            const market = this._tickerSubs.get(marketId);
            if (!market)
                return;
            const ticker = this._constructTicker(params[0][marketId], market);
            this.emit("ticker", ticker, market);
            return;
        }
        if (method === "deals.update") {
            const marketId = params[0];
            const market = this._tradeSubs.get(marketId);
            if (!market)
                return;
            for (const t of params[1].reverse()) {
                const trade = this._constructTrade(t, market);
                this.emit("trade", trade, market);
            }
            return;
        }
        if (method === "depth.update") {
            const marketId = params[2];
            const market = this._level2UpdateSubs.get(marketId);
            if (!market)
                return;
            const isLevel2Snapshot = params[0];
            if (isLevel2Snapshot) {
                const l2snapshot = this._constructLevel2Snapshot(params[1], market);
                this.emit("l2snapshot", l2snapshot, market);
            }
            else {
                const l2update = this._constructLevel2Update(params[1], market);
                this.emit("l2update", l2update, market);
            }
            return;
        }
    }
    _constructTicker(rawTick, market) {
        let { last, open, high, low, volume, deal } = rawTick, change = parseFloat(last) - parseFloat(open), changePercent = ((parseFloat(last) - parseFloat(open)) / parseFloat(open)) * 100;
        return new Ticker_1.Ticker({
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
    _constructTrade(rawTrade, market) {
        const { id, time, type, price, amount } = rawTrade;
        const unix = moment.utc(time * 1000).valueOf();
        return new Trade_1.Trade({
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
    _constructLevel2Snapshot(rawUpdate, market) {
        let { bids, asks } = rawUpdate, structuredBids = bids ? bids.map(([price, size]) => new Level2Point_1.Level2Point(price, size)) : [], structuredAsks = asks ? asks.map(([price, size]) => new Level2Point_1.Level2Point(price, size)) : [];
        return new Level2Snapshots_1.Level2Snapshot({
            exchange: this.name,
            base: market.base,
            quote: market.quote,
            bids: structuredBids,
            asks: structuredAsks,
        });
    }
    _constructLevel2Update(rawUpdate, market) {
        let { bids, asks } = rawUpdate, structuredBids = bids ? bids.map(([price, size]) => new Level2Point_1.Level2Point(price, size)) : [], structuredAsks = asks ? asks.map(([price, size]) => new Level2Point_1.Level2Point(price, size)) : [];
        return new Level2Update_1.Level2Update({
            exchange: this.name,
            base: market.base,
            quote: market.quote,
            bids: structuredBids,
            asks: structuredAsks,
        });
    }
}
exports.CoinexSingleClient = CoinexSingleClient;
//# sourceMappingURL=CoinexClient.js.map
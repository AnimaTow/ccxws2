export class Level2Point {
    constructor(
        readonly price: string,
        readonly size: string,
        readonly count?: string | number,
        readonly meta?: any,
        readonly timestamp?: number,
    ) {}
}

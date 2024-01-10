"use strict";
/* eslint-disable @typescript-eslint/require-await */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotImplementedAsyncFn = exports.NotImplementedFn = void 0;
/**
 * Function that always throws an "Not implemented" error.
 * @param args - Arguments (optional)
 * @returns An error indicating that the function is not implemented.
 */
const NotImplementedFn = (...args) => new Error("Not implemented");
exports.NotImplementedFn = NotImplementedFn;
/**
 * Async function that always throws an "Not implemented" error.
 * @param args - Arguments (optional)
 * @returns A promise rejecting with an error indicating that the function is not implemented.
 */
const NotImplementedAsyncFn = async (...args) => new Error("Not implemented");
exports.NotImplementedAsyncFn = NotImplementedAsyncFn;
//# sourceMappingURL=NotImplementedFn.js.map
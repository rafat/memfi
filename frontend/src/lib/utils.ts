// src/lib/utils.ts

/**
 * A robust replacer function for JSON.stringify that handles BigInts.
 * When JSON.stringify encounters a value, it checks its type. If it's a BigInt,
 * this function converts it to its string representation. For all other types,
 * it returns the value as-is for default processing.
 * 
 * @param {string} key - The key of the property being stringified.
 * @param {any} value - The value of the property being stringified.
 * @returns {any} - The string representation of a BigInt, or the original value.
 */
const bigIntReplacer = (key: string, value: any): any => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

/**
 * Safely converts a JavaScript object, which may contain BigInts, into a JSON string.
 * This is essential for sending data from the server (API routes) to the client,
 * as the standard JSON format does not support BigInts.
 * 
 * @param {any} obj - The object to be stringified.
 * @returns {string} - A valid JSON string with all BigInts converted to strings.
 * 
 * @example
 * const dataFromContract = {
 *   positionId: 1,
 *   balance: 12345678901234567890n,
 *   details: { nestedBalance: 987n }
 * };
 * const jsonString = safeBigIntStringify(dataFromContract);
 * // jsonString will be:
 * // '{"positionId":1,"balance":"12345678901234567890","details":{"nestedBalance":"987"}}'
 */
export function safeBigIntStringify(obj: any): string {
  return JSON.stringify(obj, bigIntReplacer);
}

/**
 * A utility function to format an address for display by showing the first few
 * and last few characters.
 * 
 * @param {string | undefined} address - The full Ethereum address.
 * @returns {string} - The truncated address (e.g., "0x1234...5678").
 */
export const formatAddress = (address?: string): string => {
  if (!address) return "No Address";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// You can add other general-purpose utility functions here as your project grows.
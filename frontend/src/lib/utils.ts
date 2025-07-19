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
 */
export function safeBigIntStringify(obj: any): string {
  return JSON.stringify(obj, bigIntReplacer);
}

/**
 * Parses a wagmi/viem error object to extract the most user-friendly message.
 * It safely checks for common properties like `shortMessage` first, then falls back
 * to the standard `message` property. This prevents TypeScript errors and runtime crashes.
 * 
 * @param {any} e - The error object, which can be of various types from different libraries.
 * @returns {string} - A clean, human-readable error message.
 */
export const getErrorMessage = (e: any): string => {
  if (!e) return "An unknown error occurred.";
  
  // Wagmi and Viem often wrap the most specific error in a `cause` property.
  // We prioritize checking the cause first.
  const error = e.cause || e;

  // Check for the common `shortMessage` property, which is usually the most readable.
  if (typeof error === 'object' && error !== null && 'shortMessage' in error && typeof error.shortMessage === 'string') {
    return error.shortMessage;
  }
  
  // Fallback to the standard `message` property.
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  // If the original error object (e) has a message, use that.
  if (typeof e.message === 'string' && e.message) {
    return e.message;
  }
  
  // Final fallback for unexpected error structures.
  return "An unexpected error occurred. Please check the console for more details.";
};

/**
 * A utility function to format an address for display by showing the first few
 * and last few characters (e.g., "0x1234...5678").
 * 
 * @param {string | undefined} address - The full Ethereum address.
 * @returns {string} - The truncated address or a fallback string.
 */
export const formatAddress = (address?: string): string => {
  if (!address) return "No Address";
  // Ensure it's a valid address format before slicing
  if (address.length < 42) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// You can add other general-purpose utility functions here as your project grows.
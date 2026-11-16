
/**
 * Generates a unique booking reference.
 * @returns {string} A unique booking reference.
 */
const generateBookingReference = () => {
    return 'JR' + Math.random().toString(36).substring(2, 10).toUpperCase();
};

/**
 * Converts kilometers to miles.
 * @param {number} km - Distance in kilometers.
 * @returns {number} Equivalent distance in miles.
 */
const kmToMiles = (km) => km * 0.621371;

/**
 * Converts Japanese yen to US dollars.
 * @param {number} yen - Amount in Japanese yen.
 * @param {number} exchangeRate - Yen-to-dollar exchange rate.
 * @returns {number} Equivalent amount in US dollars.
 */
const yenToUsd = (yen, exchangeRate) => yen * exchangeRate;

export { generateBookingReference, kmToMiles, yenToUsd };

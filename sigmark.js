const _ = require('lodash');
const fs = require('fs-extra');
const Jimp = require('jimp');

const SIG_LENGTH = 65;
const ZERO_X = 2;
const HEX_LENGTH = 2;
const LAST_COL = 60;
const NUM_ROWS = 5;
const NUM_COLS = 5;
const RGB_LENGTH = 3;

/**
 * @private
 * Generates a scan() function for JIMP to fill the given rectangle with color.
 * @param {*} color A hexidecimal color value to fill the space with.
 * @returns The callback function to provide to scan().
 */
function fillWithColor(color) {
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const a = color.length >= 8 ? parseInt(color.substring(6, 8), 16) : 255;
    return function (x, y, idx) {
        this.bitmap.data[idx + 0] = r;
        this.bitmap.data[idx + 1] = g;
        this.bitmap.data[idx + 2] = b;
        this.bitmap.data[idx + 3] = a;
    }
}

/**
 * Draws an Ethereum signature mark to either a PNG file or a JIMP object.
 * @param {*} imageObj The image file or JIMP object to draw on.
 * @param {string} sig The 65-byte Ethereum signature to encode in the format 0x12345.....
 * @param {number} startX The start position X coordinate.
 * @param {number} startY The start position Y coordinate.
 * @param {number} cellW The width of each cell in the mark (there are 5 cells across).
 * @param {number} cellH The height of each cell in the mark (there are 5 cells down).
 * @returns The modified JIMP image object, or the file which was modified.
 */
async function drawSignatureMark(imageObj, sig, startX = 3, startY = 3, cellW = 3, cellH = 3) {
    if (!imageObj) {
        throw new Error('Invalid image object.');
    }
    if (!sig || sig.length != SIG_LENGTH * ZERO_X + ZERO_X) {
        throw new Error(`Invalid signature: ${sig}`);
    }

    let image;
    if (!_.isString(imageObj)) {
        image = imageObj;
    }
    else {
        if (!imageObj.toLowerCase().endsWith('.png')) {
            throw new Error(`The file '${imageObj}' is not a PNG file.`);
        }
        if (await fs.pathExists(imageObj)) {
            image = await Jimp.read(imageObj);
        }
        else {
            image = await Jimp.read(startX * 2 + cellW * NUM_COLS, startY * 2 + cellH * NUM_ROWS);
        }
    }
    image = image.quality(100);

    const colors = [];
    for (let i = 0; i < SIG_LENGTH; i++) {
        if (i < LAST_COL) {
            colors.push(sig.substring(i * HEX_LENGTH + ZERO_X, i * HEX_LENGTH + ZERO_X + HEX_LENGTH));
        }
        if (i >= LAST_COL) {
            colors.push('00');
            colors.push(sig.substring(i * HEX_LENGTH + ZERO_X, i * HEX_LENGTH + ZERO_X + HEX_LENGTH));
            colors.push('00');
        }
    }

    for (let x = 0; x < NUM_COLS; x++) {
        for (let y = 0; y < NUM_ROWS; y++) {
            const pos = (x * NUM_COLS + y) * RGB_LENGTH;
            const color = `${colors[pos + 0]}${colors[pos + 1]}${colors[pos + 2]}`
            image = image.scan(startX + cellW * x, startY + cellH * y, cellW, cellH, fillWithColor(color));
        }
    }

    if (!_.isString(imageObj)) {
        return image;
    }
    await image.writeAsync(imageObj);
    return imageObj;
}

/**
 * Extracts an Ethereum signature from the given PNG file or JIMP object.
 * @param {*} imageObj 
 * @param {number} startX The start position X coordinate of the existing mark.
 * @param {number} startY The start position Y coordinate of the existing mark.
 * @param {number} cellW The width of each cell in the mark (there are 5 cells across).
 * @param {number} cellH The height of each cell in the mark (there are 5 cells down).
 * @returns The encoded 65-Byte signature in the format 0x12345....
 */
async function extractSignatureMark(imageObj, startX = 3, startY = 3, cellW = 3, cellH = 3) {
    if (!imageObj) {
        throw new Error('Invalid image object.');
    }

    let image;
    if (!_.isString(imageObj)) {
        image = imageObj;
    }
    else {
        if (!imageObj.toLowerCase().endsWith('.png')) {
            throw new Error(`The file '${imageObj}' is not a PNG file.`);
        }
        if (!(await fs.pathExists(imageObj))) {
            throw new Error(`The file '${imageObj}' does not exist.`);
        }
        image = await Jimp.read(imageObj);
    }

    const colors = new Array(NUM_ROWS * NUM_COLS * RGB_LENGTH * HEX_LENGTH);

    for (let x = 0; x < NUM_COLS; x++) {
        for (let y = 0; y < NUM_ROWS; y++) {
            const pos = (x * NUM_COLS + y) * RGB_LENGTH;
            const color = image.getPixelColor(startX + cellW * x + cellW / 2, startY + cellH * y + cellH / 2)
                .toString(16).padStart(8, '0');
            colors[pos + 0] = color.substring(0, 2);
            colors[pos + 1] = color.substring(2, 4);
            colors[pos + 2] = color.substring(4, 6);
        }
    }

    let result = '';
    let index = 0;
    for (let i = 0; i < SIG_LENGTH; i++) {
        if (i < LAST_COL) {
            result += colors[index++];
        }
        if (i >= LAST_COL) {
            index++;
            result += colors[index++];
            index++;
        }
    }

    return `0x${result}`;
}

module.exports = {
    drawSignatureMark,
    extractSignatureMark
};

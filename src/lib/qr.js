/**
 * A small QR code encoder: byte mode, versions 1–10, error correction level M.
 *
 * Written in-house so the library cards and the kiosk need no extra dependency —
 * the codes it produces are read back by the @zxing scanner already in the app.
 */

// Error correction level M (format information bits "00"): codewords per block,
// block count and the total codeword capacity of each supported version.
const ECC_CODEWORDS = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const TOTAL_CODEWORDS = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];

/** Alignment pattern centres, and the unused remainder bits, per version. */
const ALIGNMENT = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

/* ------------------------------------------------------------------ Galois field */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
})();

function multiply(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/* ------------------------------------------------------------------ encoding */
function appendBits(bits, value, length) {
  for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
}

function toUtf8(text) {
  const bytes = [];
  for (const char of String(text)) {
    const code = char.codePointAt(0);
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      );
  }
  return bytes;
}

function dataCapacityBits(version) {
  return (TOTAL_CODEWORDS[version] - ECC_CODEWORDS[version] * BLOCKS[version]) * 8;
}

/** The version that fits this payload, or 0 when it is too long. */
function pickVersion(length) {
  for (let version = 1; version <= 10; version += 1) {
    const needed = 4 + (version <= 9 ? 8 : 16) + length * 8;
    if (needed <= dataCapacityBits(version)) return version;
  }
  return 0;
}

function divisor(degree) {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = multiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = multiply(root, 0x02);
  }
  return result;
}

function remainder(data, div) {
  const result = new Uint8Array(div.length);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < result.length; i += 1) result[i] ^= multiply(div[i], factor);
  }
  return result;
}

/** Data codewords split into blocks, each with its error correction codewords. */
function withErrorCorrection(codewords, version) {
  const blockCount = BLOCKS[version];
  const eccLength = ECC_CODEWORDS[version];
  const div = divisor(eccLength);
  const shortLength = Math.floor(codewords.length / blockCount);
  const shortBlocks = blockCount - (codewords.length % blockCount);

  const blocks = [];
  let offset = 0;
  for (let i = 0; i < blockCount; i += 1) {
    const length = shortLength + (i < shortBlocks ? 0 : 1);
    const data = codewords.slice(offset, offset + length);
    offset += length;
    blocks.push({ data, ecc: remainder(data, div) });
  }

  const out = [];
  for (let i = 0; i <= shortLength; i += 1) {
    for (const block of blocks) if (i < block.data.length) out.push(block.data[i]);
  }
  for (let i = 0; i < eccLength; i += 1) {
    for (const block of blocks) out.push(block.ecc[i]);
  }
  return Uint8Array.from(out);
}

/* ------------------------------------------------------------------ matrix */
function addRun(history, length, size) {
  if (history[0] === 0) length += size; // the light border around the symbol
  history.pop();
  history.unshift(length);
}

function countFinderLike(history) {
  const n = history[1];
  const core = n > 0 && history[2] === n && history[3] === n * 3 && history[4] === n && history[5] === n;
  return (
    (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0) + (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0)
  );
}

function endRun(history, runColor, runLength, size) {
  let length = runLength;
  if (runColor) {
    addRun(history, length, size);
    length = 0;
  }
  addRun(history, length + size, size);
  return countFinderLike(history);
}

/** The four penalty rules from the QR specification, used to pick the best mask. */
function penaltyScore(modules, size) {
  let score = 0;

  const scanLine = (at) => {
    let runColor = false;
    let runLength = 0;
    const history = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < size; i += 1) {
      if (at(i) === runColor) {
        runLength += 1;
        if (runLength === 5) score += 3;
        else if (runLength > 5) score += 1;
      } else {
        addRun(history, runLength, size);
        if (!runColor) score += countFinderLike(history) * 40;
        runColor = at(i);
        runLength = 1;
      }
    }
    score += endRun(history, runColor, runLength, size) * 40;
  };

  for (let y = 0; y < size; y += 1) scanLine((x) => modules[y][x]);
  for (let x = 0; x < size; x += 1) scanLine((y) => modules[y][x]);

  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const colour = modules[y][x];
      if (colour === modules[y][x + 1] && colour === modules[y + 1][x] && colour === modules[y + 1][x + 1]) score += 3;
    }
  }

  let dark = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) if (modules[y][x]) dark += 1;
  }
  const total = size * size;
  score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;

  return score;
}

function maskAt(mask, x, y) {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function buildMatrix(version, codewords) {
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, dark) => {
    modules[y][x] = dark;
    reserved[y][x] = true;
  };

  const formatBits = (mask) => {
    const data = mask; // error correction level M contributes "00"
    let rest = data;
    for (let i = 0; i < 10; i += 1) rest = (rest << 1) ^ ((rest >>> 9) * 0x537);
    return ((data << 10) | rest) ^ 0x5412;
  };

  const writeFormat = (mask) => {
    const bits = formatBits(mask);
    const get = (i) => ((bits >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i += 1) set(8, i, get(i));
    set(8, 7, get(6));
    set(8, 8, get(7));
    set(7, 8, get(8));
    for (let i = 9; i < 15; i += 1) set(14 - i, 8, get(i));
    for (let i = 0; i < 8; i += 1) set(size - 1 - i, 8, get(i));
    for (let i = 8; i < 15; i += 1) set(8, size - 15 + i, get(i));
    set(8, size - 8, true); // the dark module
  };

  // Timing patterns first: the finder patterns then overwrite their ends.
  for (let i = 0; i < size; i += 1) {
    set(i, 6, i % 2 === 0);
    set(6, i, i % 2 === 0);
  }

  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, distance !== 2 && distance !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  const centres = ALIGNMENT[version];
  centres.forEach((cy) => {
    centres.forEach((cx) => {
      const overFinder = cx === 6 && (cy === 6 || cy === size - 7);
      if (overFinder || (cy === 6 && cx === size - 7)) return;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    });
  });

  writeFormat(0); // reserve the format area until the mask is chosen

  if (version >= 7) {
    let rest = version;
    for (let i = 0; i < 12; i += 1) rest = (rest << 1) ^ ((rest >>> 11) * 0x1f25);
    const bits = (version << 12) | rest;
    for (let i = 0; i < 18; i += 1) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, dark);
      set(b, a, dark);
    }
  }

  // The data fills two columns at a time, right to left, zig-zagging upwards.
  let bit = 0;
  const totalBits = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    let column = right;
    if (column === 6) column = 5; // the vertical timing pattern is skipped
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = column - j;
        const upward = ((column + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!reserved[y][x] && bit < totalBits) {
          modules[y][x] = ((codewords[bit >>> 3] >>> (7 - (bit & 7))) & 1) === 1;
          bit += 1;
        }
      }
    }
  }

  const applyMask = (mask) => {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (!reserved[y][x] && maskAt(mask, x, y)) modules[y][x] = !modules[y][x];
      }
    }
  };

  let best = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    applyMask(mask);
    writeFormat(mask);
    const score = penaltyScore(modules, size);
    if (score < bestScore) {
      best = mask;
      bestScore = score;
    }
    applyMask(mask); // XOR undoes it again
  }

  applyMask(best);
  writeFormat(best);
  return modules;
}

/** The QR code for a piece of text: a square matrix of dark (true) modules. */
export function qrMatrix(text) {
  const bytes = toUtf8(text);
  const version = pickVersion(bytes.length);
  if (!version) throw new Error("QR payload is too long");

  const capacity = dataCapacityBits(version);
  const bits = [];
  appendBits(bits, 0x4, 4); // byte mode
  appendBits(bits, bytes.length, version <= 9 ? 8 : 16);
  bytes.forEach((byte) => appendBits(bits, byte, 8));
  appendBits(bits, 0, Math.min(4, capacity - bits.length)); // terminator
  appendBits(bits, 0, (8 - (bits.length % 8)) % 8); // pad to a whole codeword
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) appendBits(bits, pad, 8);

  const codewords = new Uint8Array(capacity / 8);
  bits.forEach((value, index) => {
    if (value) codewords[index >>> 3] |= 0x80 >>> (index & 7);
  });

  return buildMatrix(version, withErrorCorrection(codewords, version));
}
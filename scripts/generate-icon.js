import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'

function createPng(width, height) {
  // RGBA buffer: height rows, each row has 1 filter byte (0) + width * 4 bytes
  const rowLength = 1 + width * 4
  const rawData = Buffer.alloc(rowLength * height)

  const bgColor = [13, 15, 20, 255]       // #0d0f14
  const primaryColor = [122, 162, 247, 255] // #7aa2f7 (acc blue)
  const okColor = [139, 212, 156, 255]      // #8bd49c (green)
  const borderColor = [45, 52, 70, 255]

  const cx = width / 2
  const cy = height / 2
  const radius = width * 0.44

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength
    rawData[rowOffset] = 0 // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4

      // Rounded container calculation
      const dx = Math.abs(x - cx)
      const dy = Math.abs(y - cy)
      const cornerR = width * 0.18
      const boxW = width * 0.40
      const boxH = height * 0.40

      let inside = false
      if (dx <= boxW && dy <= boxH) {
        inside = true
      } else if (dx <= boxW + cornerR && dy <= boxH - cornerR) {
        inside = true
      } else if (dx <= boxW - cornerR && dy <= boxH + cornerR) {
        inside = true
      } else {
        const cdx = dx - (boxW - cornerR)
        const cdy = dy - (boxH - cornerR)
        if (cdx > 0 && cdy > 0 && (cdx * cdx + cdy * cdy <= cornerR * cornerR)) {
          inside = true
        }
      }

      if (!inside) {
        // Transparent outside
        rawData[pxOffset] = 0
        rawData[pxOffset + 1] = 0
        rawData[pxOffset + 2] = 0
        rawData[pxOffset + 3] = 0
        continue
      }

      // Inside app icon container
      let color = bgColor

      // Terminal prompt symbol '> '
      // Draw prompt chevron '>'
      const inChevron =
        (x >= width * 0.28 && x <= width * 0.48) &&
        (Math.abs((y - height * 0.48) - (x - width * 0.38) * 1.4) < width * 0.04 ||
         Math.abs((y - height * 0.48) + (x - width * 0.38) * 1.4) < width * 0.04) &&
        x < width * 0.48

      // Cursor block '_'
      const inCursor =
        x >= width * 0.52 && x <= width * 0.72 &&
        y >= height * 0.58 && y <= height * 0.65

      // Top traffic dots
      const inDot1 = Math.hypot(x - width * 0.28, y - height * 0.26) <= width * 0.03
      const inDot2 = Math.hypot(x - width * 0.38, y - height * 0.26) <= width * 0.03
      const inDot3 = Math.hypot(x - width * 0.48, y - height * 0.26) <= width * 0.03

      if (inChevron) {
        color = primaryColor
      } else if (inCursor) {
        color = okColor
      } else if (inDot1) {
        color = [240, 113, 120, 255] // Red
      } else if (inDot2) {
        color = [229, 181, 103, 255] // Yellow
      } else if (inDot3) {
        color = okColor // Green
      }

      rawData[pxOffset] = color[0]
      rawData[pxOffset + 1] = color[1]
      rawData[pxOffset + 2] = color[2]
      rawData[pxOffset + 3] = color[3]
    }
  }

  // PNG chunks
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  // IHDR chunk
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // color type: RGBA
  ihdrData[10] = 0 // compression: deflate
  ihdrData[11] = 0 // filter
  ihdrData[12] = 0 // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData)

  // IDAT chunk (compressed raw data)
  const compressed = deflateSync(rawData)
  const idatChunk = createChunk('IDAT', compressed)

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createChunk(type, data) {
  const len = data.length
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = crc32(body)

  const chunk = Buffer.alloc(4 + 4 + len + 4)
  chunk.writeUInt32BE(len, 0)
  typeBuf.copy(chunk, 4)
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc, 8 + len)
  return chunk
}

if (!existsSync('build')) {
  mkdirSync('build', { recursive: true })
}
if (!existsSync('resources')) {
  mkdirSync('resources', { recursive: true })
}

const png256 = createPng(256, 256)
const png512 = createPng(512, 512)

writeFileSync(join('build', 'icon.png'), png512)
writeFileSync(join('resources', 'icon.png'), png256)
console.log('Successfully generated build/icon.png and resources/icon.png')

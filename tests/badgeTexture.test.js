import assert from 'node:assert/strict'
import test from 'node:test'
import { createBadgeCanvas, DESIGN_H, DESIGN_W, downloadBadge, TEXTURE_SIZE } from '../src/utils/badgeTexture.js'
import { surfaceGlsl } from '../src/utils/badgeSurface.js'
import { getSurface, lanyardColor, LANYARDS, SURFACES } from '../src/data/badgeStyles.js'

function canvasFixture(t) {
  const drawings = []
  const text = []
  const clips = []
  const anchors = []
  const canvases = []
  const transforms = []
  let imageData = (width, height) => new Uint8ClampedArray(width * height * 4).fill(255)
  const gradient = { addColorStop() {} }
  const methods = {
    rect(...args) { clips.push(args) },
    setTransform(...args) { transforms.push(args) },
    drawImage(...args) { drawings.push(args) },
    getImageData: (x, y, width, height) => ({ data: imageData(width, height) }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    measureText(value) {
      return { width: value.length * Number(this.font.match(/(\d+)px/)[1]) * 0.55 }
    },
    fillText(value, x, y, maxWidth) { text.push({ value, x, y, maxWidth, font: this.font, fill: this.fillStyle }) },
  }
  // Any drawing call the assertions do not inspect is a no-op.
  const context = new Proxy({ font: '' }, {
    get(target, key) {
      if (key in methods) return methods[key]
      if (key in target) return target[key]
      return () => {}
    },
  })
  const originalDocument = globalThis.document
  globalThis.document = {
    createElement(tag) {
      if (tag === 'a') {
        const anchor = { click() { this.clicked = true }, remove() { this.removed = true } }
        anchors.push(anchor)
        return anchor
      }
      const canvas = {
        width: 0,
        height: 0,
        getContext: (type) => (type === '2d' ? context : null),
        toBlob: (callback) => callback(new Blob([], { type: 'image/png' })),
      }
      canvases.push(canvas)
      return canvas
    },
    body: { append() {} },
  }
  t.after(() => {
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
  })
  return {
    drawings, text, clips, transforms, anchors, canvases,
    setImageData(fn) { imageData = fn },
  }
}

test('renders the edited name and role on both badge faces', (t) => {
  const { text } = canvasFixture(t)
  const canvas = createBadgeCanvas({ width: 400, height: 400 }, null, {
    name: '  Alex Rivera  ',
    role: '  UX Research  ',
  })
  assert.equal(canvas.width, TEXTURE_SIZE)
  assert.equal(canvas.height, TEXTURE_SIZE)
  assert.equal(text.filter(({ value }) => value === 'Alex Rivera').length, 2)
  assert.equal(text.filter(({ value }) => value === 'UX Research').length, 2)
})

test('paints each face into its own atlas half at the true card aspect', (t) => {
  const { transforms } = canvasFixture(t)
  createBadgeCanvas({ width: 400, height: 400 }, null, { name: 'Alex', role: 'Design' })
  const faceW = TEXTURE_SIZE / 2
  const faceH = Math.round(TEXTURE_SIZE * 0.755)
  assert.deepEqual(transforms, [
    [faceW / DESIGN_W, 0, 0, faceH / DESIGN_H, 0, 0],
    [faceW / DESIGN_W, 0, 0, faceH / DESIGN_H, faceW, 0],
  ])
})

test('crops wide portraits to the rounded frame on the front only', (t) => {
  const { drawings } = canvasFixture(t)
  const photo = { width: 1200, height: 400 }
  createBadgeCanvas(photo, null, { name: 'Alex', role: 'Design' })
  const photos = drawings.filter(([image]) => image === photo)
  assert.equal(photos.length, 1)
  assert.equal(photos[0][3], 804)
  assert.equal(photos[0][4], 268)
})

test('leaves the brand row empty without a company, and prints the name on both faces with one', (t) => {
  const { text } = canvasFixture(t)
  createBadgeCanvas({ width: 400, height: 400 }, null, { name: 'Alex', role: 'Design', companyName: '  ' })
  const before = text.length
  assert.ok(text.every(({ value }) => value.trim()))
  createBadgeCanvas({ width: 400, height: 400 }, null, { name: 'Alex', role: 'Design', companyName: ' Northwind ' })
  assert.equal(text.slice(before).filter(({ value }) => value === 'Northwind').length, 2)
})

test('prints transparent logos as a cropped silhouette and opaque logos on a tag', (t) => {
  const { drawings, setImageData } = canvasFixture(t)
  // 10 × 10 logo whose only ink is a 4 × 2 block at (3, 5).
  setImageData((width, height) => {
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 5; y < 7; y += 1) for (let x = 3; x < 7; x += 1) data[(y * width + x) * 4 + 3] = 255
    return data
  })
  const transparentLogo = { width: 10, height: 10 }
  createBadgeCanvas({ width: 400, height: 400 }, transparentLogo, { name: 'Alex', role: 'Design' })
  const silhouettes = drawings.filter((args) => args.length === 9 && args[1] === 3 && args[2] === 5)
  assert.equal(silhouettes.length, 2)
  assert.deepEqual(silhouettes[0].slice(3, 5), [4, 2])

  setImageData((width, height) => new Uint8ClampedArray(width * height * 4).fill(255))
  const opaqueLogo = { width: 200, height: 100 }
  createBadgeCanvas({ width: 400, height: 400 }, opaqueLogo, { name: 'Alex', role: 'Design' })
  const tags = drawings.filter(([image, x, , w, h]) => image === opaqueLogo && x > 0 && w / h === 2)
  assert.equal(tags.length, 2)
})

test('fits long names and roles inside the badge and provides empty-field placeholders', (t) => {
  const { text } = canvasFixture(t)
  createBadgeCanvas({ width: 400, height: 400 }, null, {
    name: 'A'.repeat(50),
    role: 'B'.repeat(70),
  })
  const fitted = text.filter(({ value }) => /^(A+|B+)$/.test(value))
  assert.equal(fitted.length, 4)
  for (const drawing of fitted) {
    const size = Number(drawing.font.match(/(\d+)px/)[1])
    assert.ok(drawing.maxWidth <= DESIGN_W - 80)
    assert.ok(drawing.value.length * size * 0.55 <= drawing.maxWidth || size === 12)
  }
  createBadgeCanvas({ width: 400, height: 400 }, null, { name: ' ', role: '' })
  assert.equal(text.filter(({ value }) => value === 'Your name').length, 2)
  assert.equal(text.filter(({ value }) => value === 'Your role').length, 2)
})

test('exports only the front face, un-squeezed to the card aspect, with a safe filename', async (t) => {
  const { drawings, anchors, canvases } = canvasFixture(t)
  const originalWindow = globalThis.window
  globalThis.window = { setTimeout: (callback) => callback() }
  t.after(() => {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  })
  const image = {}
  await downloadBadge({ image }, ' Zoë / Design ')
  assert.deepEqual(drawings[0], [image, 0, 0, 1024, 1546, 0, 0, 1106, 1546])
  assert.equal(canvases[0].width, 1106)
  assert.equal(canvases[0].height, 1546)
  assert.equal(anchors[0].download, 'Zoë-Design-badge.png')
  assert.equal(anchors[0].clicked, true)
  assert.equal(anchors[0].removed, true)
})

test('prints the edited event on both faces and falls back to Hang In There when cleared', (t) => {
  const { text } = canvasFixture(t)
  createBadgeCanvas({ width: 400, height: 400 }, null, { name: 'Alex', role: 'Design', title: '  Demo day  ' })
  assert.equal(text.filter(({ value }) => value === 'Demo day').length, 2)
  text.length = 0
  createBadgeCanvas({ width: 400, height: 400 }, null, { name: 'Alex', role: 'Design', title: ' ' })
  assert.ok(text.some(({ value }) => value === 'Hang In There'))
  assert.ok(text.some(({ value }) => /Hang/.test(value) && value !== 'Hang In There'), 'back title wraps the default')
})

test('prints the edited tagline and badge number, and drops them when cleared', (t) => {
  const { text } = canvasFixture(t)
  createBadgeCanvas({ width: 400, height: 400 }, null, { name: 'Alex', role: 'Design', weekLabel: ' Lightning talks ', badgeId: ' 7 ' })
  assert.equal(text.filter(({ value }) => value === 'Lightning talks').length, 2)
  assert.equal(text.filter(({ value }) => value === '7').length, 2)
  text.length = 0
  createBadgeCanvas({ width: 400, height: 400 }, null, { name: 'Alex', role: 'Design', weekLabel: '  ', badgeId: '' })
  assert.ok(!text.some(({ value }) => value === 'AI share-out' || value === 'No.'))
})

test('refuses to export an unready badge', async () => {
  await assert.rejects(downloadBadge(null, 'Alex'), /not ready/)
})

test('prints the week label in the selected surface accent, falling back to the first style', (t) => {
  const { text } = canvasFixture(t)
  createBadgeCanvas({ width: 400, height: 400 }, null, { name: 'Alex', role: 'Design', surface: 'volt', weekLabel: 'Demo day' })
  const labels = text.filter(({ value }) => value === 'Demo day')
  assert.equal(labels.length, 2)
  assert.ok(labels.every(({ fill }) => fill === getSurface('volt').accent))
  assert.equal(getSurface('unknown').id, SURFACES[0].id)
})

test('gives every surface its own shader and resolves the lanyard color', () => {
  const sources = SURFACES.map(({ id }) => surfaceGlsl(id))
  assert.equal(new Set(sources).size, SURFACES.length)
  for (const source of sources) assert.equal(source.match(/void badgeSurface\(/g).length, 1)
  assert.equal(lanyardColor('match', 'halftone'), getSurface('halftone').lanyard)
  assert.equal(lanyardColor('white', 'halftone'), LANYARDS.find(({ id }) => id === 'white').color)
  assert.equal(lanyardColor(undefined, 'chrome'), getSurface('chrome').lanyard)
})

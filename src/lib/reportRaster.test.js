import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rasterizeReportSvg } from './reportRaster.js'

test('renders without animation frames or decode and releases canvas memory', async (t) => {
  const previousImage = globalThis.Image, previousDocument = globalThis.document
  t.after(() => { globalThis.Image = previousImage; globalThis.document = previousDocument })
  let image, fail = false
  globalThis.Image = class {
    constructor() { image = this }
    set src(value) { if (value) queueMicrotask(() => fail ? this.onerror() : this.onload()) }
    decode() { throw new Error('decode must not be used') }
  }
  const canvas = {
    width: 0, height: 0,
    getContext: () => ({ drawImage: () => { assert.equal(canvas.width, 1400) } }),
    toDataURL: () => 'data:image/png;base64,ok',
  }
  globalThis.document = { createElement: () => canvas }
  assert.equal(await rasterizeReportSvg('svg', 1120, 794, 1.25), 'data:image/png;base64,ok')
  assert.equal(canvas.width, 0)
  assert.equal(canvas.height, 0)
  assert.equal(image.onload, null)
  fail = true
  await assert.rejects(rasterizeReportSvg('svg', 1120, 794), /could not load/)
  assert.equal(image.onerror, null)
})

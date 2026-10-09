import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { finalizeReportScoreBars } from './reportScoreBars.js'

function fixture(score) {
  const bar = {
    getAttribute: (name) => name === 'data-score-token' ? 'gi_dc_score' : null,
    style: { maxWidth: '584.8px', width: '0px', setProperty(key, value) { this[key] = value } },
  }
  const source = { textContent: score, getAttribute: () => 'gi_dc_score' }
  const document = {
    querySelectorAll: (selector) => selector.startsWith('.barfill') ? [bar] : [source],
    querySelector: () => source,
  }
  return { bar, document }
}

test('PDF bars use final score widths without animation, including old previews', () => {
  for (const [score, width] of [['1.0', '146.2px'], ['3.44', '502.9px'], ['4', '584.8px'], ['', '0.0px'], ['0', '0.0px']]) {
    const { bar, document } = fixture(score)
    finalizeReportScoreBars(document)
    assert.equal(bar.style.width, width)
    assert.equal(bar.style.transition, 'none')
  }
})

test('template assigns score widths synchronously without animation callbacks', async () => {
  const template = await readFile(new URL('../../server/templates/dc-report/template.html', import.meta.url), 'utf8')
  const script = template.split('<script>')[1].split('// ---- Shrink-to-fit')[0]
  const { bar, document } = fixture('3.44')
  vm.runInNewContext(`${script}\n})();`, { document })
  assert.equal(bar.style.width, '502.9px')
  assert.doesNotMatch(template.match(/\.barfill\{[^}]+\}/)[0], /transition/)
})

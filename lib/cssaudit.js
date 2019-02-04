/**
# CSSAudit
*/

import { makeArray, forEachKey } from '../source/b8r.iterators.js'

function audit () {
  const selectors = {}
  const sources = {}

  makeArray(document.styleSheets).forEach(sheet => {
    const title = sheet.href || sheet.ownerNode.dataset.title
    if (sources[title]) {
      console.error(title, 'occurs more than once')
    } else {
      sources[title] = {
        duplicateSelectors: [],
        unusedSelectors: []
      }
    }
    makeArray(sheet.rules || []).forEach(rule => {
      const selector = rule.selectorText
      if (!selectors[selector]) { selectors[selector] = { count: 0, sources: [] } }
      selectors[selector].sources.push(title)
      selectors[selector].count += 1
    })
  })

  forEachKey(selectors, (data, selector) => {
    const subSelectors = selector.split(',')
    data.missingMatches = []
    subSelectors.forEach(subSelector => {
      if (subSelector.match(/:/)) {
        subSelector = (' ' + subSelector).replace(/([\s>+]):/g, '$1*:')
        subSelector = subSelector.replace(/:{1,2}[^:\s,}]+/g, '').trim()
      }
      try {
        if (subSelector.trim() && !document.querySelector(subSelector)) {
          data.missingMatches.push(subSelector)
        }
      } catch (e) {
        debugger // eslint-disable-line no-debugger
        console.error(subSelector, 'from', selector, 'threw exception')
      }
    })
    if (data.count > 1) {
      data.sources.forEach(source => sources[source].duplicateSelectors.push(selector))
    }
    if (data.missingMatches.length > 0) {
      data.sources.forEach(source => sources[source].unusedSelectors.push(selector))
    }
  })

  console.log('CSS Audit Results', sources)
  forEachKey(sources, (data, source) => {
    if (data.unusedSelectors.length || data.duplicateSelectors.length) {
      console.log(source, 'unused: ', data.unusedSelectors.join(', '), 'duplicates: ', data.duplicateSelectors.join(', '))
    }
  })
}

export {
  audit
}

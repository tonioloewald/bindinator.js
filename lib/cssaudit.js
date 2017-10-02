/**
# CSSAudit
*/
'use strict';

const {makeArray, forEachKey} = require('../source/b8r.iterators.js');

function audit() {
  const selectors = {};
  const sources = {};

  makeArray(document.styleSheets).forEach(sheet => {
    const title = sheet.href || sheet.ownerNode.dataset.title;
    if (sources[title]) {
      console.error(title, 'occurs more than once');
    } else {
      sources[title] = {
        duplicateSelectors: [],
        unusedSelectors: [],
      };
    }
    makeArray(sheet.rules || []).forEach(rule => {
      const selector = rule.selectorText;
      if (!selectors[selector]) { selectors[selector] = { count: 0, sources: [] }; }
      selectors[selector].sources.push(title);
      selectors[selector].count += 1;
    });
  });

  forEachKey(selectors, (data, selector) => {
    const sub_selectors = selector.split(',');
    data.missingMatches = [];
    sub_selectors.forEach(sub_selector => {
      if (sub_selector.match(/\:/)) {
        sub_selector = (' ' + sub_selector).replace(/([\s>+])\:/g, '$1*:');
        sub_selector = sub_selector.replace(/\:{1,2}[^:\s,}]+/g, '').trim();
      }
      try {
        if (sub_selector.trim() && !document.querySelector(sub_selector)) {
          data.missingMatches.push(sub_selector);
        }
      } catch(e) {
        debugger;
        console.error(sub_selector, 'from', selector, 'threw exception');
      }
    });
    if (data.count > 1) {
      data.sources.forEach(source => sources[source].duplicateSelectors.push(selector));
    }
    if (data.missingMatches.length > 0) {
      data.sources.forEach(source => sources[source].unusedSelectors.push(selector));
    }
  });

  console.log('CSS Audit Results', sources);
  forEachKey(sources, (data, source) => {
    if (data.unusedSelectors.length || data.duplicateSelectors.length) {
      console.log(source, 'unused: ', data.unusedSelectors.join(', '), 'duplicates: ', data.duplicateSelectors.join(', '));
    }
  });
}

module.exports = {
  audit,
};

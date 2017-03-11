/**
# Keystroke

Leverages the new event.code property to generate normalized keystrokes without
requiring a big lookup table. Removes Key and Digit to make the codes simpler.

    keystroke(event) // => produces normalized keystroke of the form alt-X
*/
/* global module */
'use strict';

module.exports = (evt) => {
  var code = [];
  if(evt.altKey){ code.push('alt'); }
  if(evt.ctrlKey){ code.push('ctrl'); }
  if(evt.metaKey){ code.push('meta'); }
  if(evt.shiftKey){ code.push('shift'); }
  if(evt.code) {
    code.push(evt.code.replace(/Key|Digit/, ''));
  } else {
    var synthetic_code = evt.keyIdentifier;
    if (synthetic_code.substr(0,2) === 'U+') {
      synthetic_code = String.fromCharCode(parseInt(evt.keyIdentifier.substr(2), 16));
    }
    code.push(synthetic_code);
  }
  return code.join('-');
};

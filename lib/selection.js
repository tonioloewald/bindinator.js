/**
# selection

Utilities for dealing with contenteditable. (Actually works for pretty much anything so far.)

Usage:

    getSelection(element); // => {text, selStart, selEnd, selected_text}

Gets you the selection the way it works in a normal input field.

    setSelection(element, selStart, selEnd);

Selects the range indicated. `selEnd` is optional.

Note that these work just the way you'd expect under the hood, creating a range that extends from
the appropriate offset in the proper element to the appropriate offset in the proper element.

*/
/* global module */
'use strict';

function length_of_text_before(element, parent) {
  let length = 0;
  while (element !== parent) {
    if (element.previousSibling) {
      element = element.previousSibling;
      length += element.textContent.length;
    } else {
      element = element.parentElement;
    }
  }
  return length;
}

function element_and_offset_at_offset(element, offset) {
  if (offset === 0) {
    return {element, offset};
  }
  if (element.textContent.length < offset) {
    return null;
  }
  if (element instanceof Text) {
    if (offset <= element.textContent.length) {
      return {element, offset};
    }
  }
  for(let i = 0; i < element.childNodes.length; i++) {
    let node = element.childNodes[i];
    if (typeof node.textContent === 'string' && offset <= node.textContent.length) {
      return element_and_offset_at_offset(node, offset);
    } else {
      if (node.textContent) {
        offset -= node.textContent.length;
      }
    }
  }
}

module.exports = {
  getSelection (element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return {
        text: element.value,
        selStart: element.selectionStart,
        selEnd: element.selectionEnd,
        selectedText: element.value.substr(element.selectionStart, element.selectionEnd - element.selectionStart),
      };
    }

    const selection = document.getSelection();
    const text = element.textContent;

    if (selection.anchorNode !== element && !element.contains(selection.anchorNode)) {
      return {text, selStart: 0, selEnd: text.length, selectedText: text};
    }

    element.normalize();
    const start = selection.anchorOffset + length_of_text_before(selection.anchorNode, element);
    const end = selection.focusOffset + length_of_text_before(selection.focusNode, element);
    const selStart = Math.min(start, end);
    const selEnd = Math.max(start, end);
    const selectedText = text.substr(selStart, selEnd - selStart);
    return {text, selStart, selEnd, selectedText};
  },

  setSelection (editable, selStart, selEnd) {
    editable.normalize();
    const selection = window.getSelection();
    const range = document.createRange();
    {
      let {element, offset} = element_and_offset_at_offset(editable, selStart);
      range.setStart(element, offset);
    }
    {
      let {element, offset} = element_and_offset_at_offset(editable, selEnd || selStart);
      range.setEnd(element, offset);
    }
    selection.removeAllRanges();
    selection.addRange(range);
  },
};

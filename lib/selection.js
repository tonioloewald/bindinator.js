/**
# selection

Utilities for dealing with contenteditable. (Actually works for pretty much anything so far.)

Usage:

    getSelection(element); // => {text, selStart, selEnd, selectedText}

Gets you the selection the way it works in a normal input field.

    setSelection(element, selStart, selEnd);

Selects the range indicated. `selEnd` is optional.

Note that these work just the way you'd expect under the hood, creating a range that extends from
the appropriate offset in the proper element to the appropriate offset in the proper element.

*/
/* global Text, HTMLInputElement, HTMLTextAreaElement */
'use strict'
const nbsp = ' ' // non-breaking space

function lengthOfTextBefore (element, parent) {
  let length = 0
  while (element !== parent) {
    if (element.previousSibling) {
      element = element.previousSibling
      length += element.textContent.length
    } else {
      element = element.parentElement
    }
  }
  return length
}

function elementAndOffsetAtOffset (element, offset) {
  if (offset === 0) {
    return { element, offset }
  }
  if (element.textContent.length < offset) {
    return null
  }
  if (element instanceof Text) {
    if (offset <= element.textContent.length) {
      return { element, offset }
    }
  }
  for (let i = 0; i < element.childNodes.length; i++) {
    const node = element.childNodes[i]
    if (typeof node.textContent === 'string' && offset <= node.textContent.length) {
      return elementAndOffsetAtOffset(node, offset)
    } else {
      if (node.textContent) {
        offset -= node.textContent.length
      }
    }
  }
}

function getSelection (element) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return {
      text: element.value,
      selStart: element.selectionStart,
      selEnd: element.selectionEnd,
      selectedText: element.value.substr(element.selectionStart, element.selectionEnd - element.selectionStart)
    }
  }

  const selection = document.getSelection()
  const text = element.textContent

  if (selection.anchorNode !== element && !element.contains(selection.anchorNode)) {
    return { text, selStart: 0, selEnd: text.length, selectedText: text }
  }

  element.normalize()
  const start = selection.anchorOffset + lengthOfTextBefore(selection.anchorNode, element)
  const end = selection.focusOffset + lengthOfTextBefore(selection.focusNode, element)
  const selStart = Math.min(start, end)
  const selEnd = Math.max(start, end)
  const selectedText = text.substr(selStart, selEnd - selStart)
  return { text, selStart, selEnd, selectedText }
}

function setSelection (editable, selStart, selEnd) {
  editable.normalize()
  const selection = window.getSelection()
  const range = document.createRange()
  {
    const { element, offset } = elementAndOffsetAtOffset(editable, selStart)
    range.setStart(element, offset)
  }
  {
    const { element, offset } = elementAndOffsetAtOffset(editable, selEnd || selStart)
    range.setEnd(element, offset)
  }
  selection.removeAllRanges()
  selection.addRange(range)
}

function replaceSelection (element, newText, addSpaces, retainSelection) {
  const { selStart, selEnd, text } = getSelection(element)

  if (selStart === 0 && selEnd === text.length) {
    element.textContent = newText + nbsp
    setSelection(element, newText.length + 1, 0)
    return
  }

  if (addSpaces) {
    if (selStart > 0 && !text[selStart - 1].match(/\s/)) {
      newText = ' ' + newText
    }
    if (selEnd === text.length || !text[selEnd].match(/\s/)) {
      newText += ' '
    }
  }

  const selection = window.getSelection()
  if (selection.rangeCount) {
    const range = selection.getRangeAt(0)
    range.deleteContents()
    range.insertNode(document.createTextNode(newText))
    if (!retainSelection) {
      range.collapse()
    }
  }
}

export { getSelection, setSelection, replaceSelection }

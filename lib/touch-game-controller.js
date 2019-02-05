/**
# Touch Game Controller

A controller for on-screen touch-savvy game controllers.
*/
/* global require, console */
'use strict'

const b8r = require('../source/b8r.js')
const clamp = (x, min, max) => x < min ? min : (x > max ? max : x)
const sticks = {}
const buttons = {}

b8r.on(document.body, ['mousemove', 'touchmove'], 'touch-game-controller.stickMove')
b8r.on(document.body, ['mouseup', 'touchend'], 'touch-game-controller.end')

b8r.register('touch-game-controller', {
  sticks,
  buttons,
  stickStart (evt, element) {
    let stick = b8r.findValue(sticks, stick => stick.element === element)
    if (!stick) {
      /* in iOS evt.changedTouches may have length > 1 but let's ignore that */
      const title = element.getAttribute('title')
      stick = { element, title }
      sticks[title] = stick
    }
    const id = evt.type === 'touchstart' ? evt.changedTouches[0] : 'mousedown'
    stick.id = id
    stick.origin = { x: evt.x, y: evt.y }
    stick.x = 0
    stick.y = 0
    stick.width = element.clientWidth
    stick.height = element.clientHeight
  },
  stickMove (evt) {
    const id = evt.type === 'touchstart' ? evt.changedTouches[0] : 'mousedown'
    const stick = b8r.findValue(sticks, stick => stick.id === id)
    if (stick && stick.origin) {
      stick.x = clamp((evt.x - stick.origin.x) * 2 / stick.width, -1, 1)
      stick.y = clamp((evt.y - stick.origin.y) * 2 / stick.height, -1, 1)
      console.log(stick.title, stick.x, stick.y)
    } else {
      return true
    }
  },
  buttonDown (evt, element) {
    let button = b8r.findValue(buttons, button => button.element === element)
    if (!button) {
      const title = element.getAttribute('title')
      button = { element, title }
      buttons[title] = button
    }
    const id = evt.type === 'touchstart' ? evt.changedTouches[0] : 'mousedown'
    button.id = id
    button.active = true
    console.log(button.title, button.active, button.toggle ? 'on' : 'off')
  },
  end (evt) {
    const id = evt.type === 'touchstart' ? evt.changedTouches[0] : 'mousedown'
    const stick = b8r.findValue(sticks, stick => stick.id === id)
    const button = b8r.findValue(buttons, button => button.id === id)

    if (stick) {
      delete stick.id
    } else if (button) {
      if (button.element.dataset.radioset) {
        const radioset = button.element.dataset.radioset.split(',')
        radioset.forEach(item => {
          b8r.set(`touch-game-controller.buttons.${item}.toggle`, item === button.title)
        })
      } else {
        const buttonPath = `touch-game-controller.buttons.${button.title}`
        b8r.set(`${buttonPath}.toggle`, !b8r.get(`${buttonPath}.toggle`))
      }
      console.log(button.title, button.active, button.toggle ? 'on' : 'off')
      delete button.id
    } else {
      return true
    }
  }
})

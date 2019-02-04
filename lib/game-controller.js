/**
# Game Controller

Keeps track of keyboard and mouse state globally, so you don't have to.
*/

import b8r from '../source/b8r.js'
import { keycode } from '../source/b8r.keystroke.js'

const buttons = { mouseButtons: [] }
// const _gamepads = b8r.makeArray(navigator.getGamepads()).map(gamepad => gamepad || {});
const axes = {}

const gameController = {
  keydown (evt) {
    buttons[keycode(evt)] = true
    return true
  },

  keyup (evt) {
    buttons[keycode(evt)] = false
    return true
  },

  mousedown (evt) {
    buttons.mouseButtons[evt.button] = true
    buttons.mouse = !!buttons.mouseButtons[0]
    return true
  },

  mouseup (evt) {
    buttons.mouseButtons[evt.button] = false
    buttons.mouse = !!buttons.mouseButtons[0]
    return true
  },

  mousemove (evt) {
    axes.mouseX = evt.clientX
    axes.mouseY = evt.clientY
    axes.h = evt.clientX / window.innerWidth * 2 - 1
    axes.v = evt.clientY / window.innerHeight * 2 - 1
    return true
  }
}

/*
window.addEventListener("gamepadconnected", evt => {
  console.log('gamepad connected', evt.gamepad); // jshint ignore:line
  _gamepads[evt.gamepad.index] = evt.gamepad;
});

window.addEventListener("gamepaddisconnected", evt => {
  console.log('gamepad disconnected', evt.gamepad); // jshint ignore:line
  _gamepads[evt.gamepad.index] = {};
});
*/

const _fauxGamepad = {
  axes: [],
  buttons: []
}

const gamepads = () => b8r.makeArray(navigator.getGamepads()).map(gamepad => gamepad || _fauxGamepad)

b8r.register('game-controller', gameController)

b8r.forEachKey(gameController, (_, eventType) => {
  b8r.onAny(eventType, `game-controller.${eventType}`)
})

export { buttons, axes, gamepads }

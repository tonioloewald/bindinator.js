/**
# Game Controller

Keeps track of keyboard and mouse stage globally, so you don't have to.
*/
/* global require, module */
'use strict';

const buttons = {
  mouseButtons: []
};
const axes = {};
const b8r = require('source/b8r.js');
const {keycode} = require ('source/b8r.keystroke.js');

const game_controller = {
  keydown (evt) {
    return buttons[keycode(evt)] = true; // jshint ignore:line
  },

  keyup (evt) {
     buttons[keycode(evt)] = false;
     return true;
  },

  mousedown (evt) {
    buttons.mouseButtons[evt.button] = true;
    buttons.mouse = !!buttons.mouseButtons[0];
    return true;
  },

  mouseup (evt) {
    buttons.mouseButtons[evt.button] = false;
    buttons.mouse = !!buttons.mouseButtons[0];
    return true;
  },

  mousemove (evt) {
    axes.mouseX = evt.clientX;
    axes.mouseY = evt.clientY;
    axes.h = evt.clientX / window.innerWidth * 2 - 1;
    axes.v = evt.clientY / window.innerHeight * 2 - 1;
    return true;
  },
};

b8r.register('game-controller', game_controller);

b8r.forEachKey(game_controller, (_, event_type) => {
  b8r.onAny(event_type, `game-controller.${event_type}`);
});

module.exports = {buttons, axes};

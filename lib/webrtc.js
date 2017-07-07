/**
# webrtc

webrtc configuration with localStorage persistence
*/
/* global require, module, console */
'use strict';

const settings_path = 'webrtc-device-list.settings';
const b8r = require('../source/b8r.js');
const listeners = [];

const addListener = listener => listeners.indexOf(listener) === -1 && listeners.push(listener);

const removeListener = listener => {
  for(let i = listeners.length - 1; i >= 0; i--) {
    if (listeners[i] === listener) {
      listeners.splice(i, 1);
    }
  }
};

b8r.set('webrtc-device-list', {
  settings: JSON.parse(localStorage.getItem(settings_path) || '{}'),
});

const update = () => {
  navigator.mediaDevices.enumerateDevices().then(
    devices => {
      const sources = {};
      const settings = b8r.get(settings_path);
      devices.forEach(device => {
        sources[device.kind] = sources[device.kind] || [];
        const {label, deviceId, groupId} = device;
        sources[device.kind].push({
          label,
          deviceId,
          groupId,
          _current: settings[device.kind] === deviceId}
        );
      });
      if (!settings.audioinput && sources.audioinput.length) {
        console.log('settings default audioinput to', sources.audioinput[0]);
        settings.audioinput = sources.audioinput[0].deviceId;
      }
      if (!settings.videoinput && sources.videoinput.length) {
        console.log('settings default videoinput to', sources.audioinput[0]);
        settings.videoinput = sources.videoinput[0].deviceId;
      }
      b8r.set('webrtc-device-list.sources', sources);
    }
  );
};

const saveSettings = b8r.debounce(
  () => {
    console.log('saving webrtc-device-list.settings');
    localStorage.setItem(settings_path, b8r.getJSON(settings_path));
  },
  100
);

b8r.observe('webrtc-device-list.settings', saveSettings);

navigator.mediaDevices.addEventListener('devicechange', update);

update();

module.exports = {
  update,
  addListener,
  removeListener,
};

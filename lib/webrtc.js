/**
# webrtc

webrtc configuration with localStorage persistence
*/
/* global require, module, console */
'use strict';

const settings_path = 'webrtc-devices.settings';
const b8r = require('../source/b8r.js');
const listeners = [];

if (!navigator.mediaDevices) {
  throw 'navigator.mediaDevices not found; webrtc not supported';
}

const addListener = listener => listeners.indexOf(listener) === -1 && listeners.push(listener);

const removeListener = listener => {
  for(let i = listeners.length - 1; i >= 0; i--) {
    if (listeners[i] === listener) {
      listeners.splice(i, 1);
    }
  }
};

b8r.set('webrtc-devices', {
  settings: JSON.parse(localStorage.getItem(settings_path) || '{}'),
});

const defaultLabels = {
  videoinput: 'Default Camera',
  audioinput: 'Default Microphone'
};

const update = () => {
  navigator.mediaDevices.enumerateDevices().then(
    devices => {
      const sources = {
        audioinput: [],
        videoinput: [],
        audiooutput: []
        // There appears to be no such thing as "videooutput" - I suppose you're supposed to assume
        // you're not in a headless environment
      };
      const settings = b8r.get(settings_path);
      devices.forEach(device => {
        sources[device.kind] = sources[device.kind] || [];
        const {label, deviceId, groupId} = device;
        sources[device.kind].push({
          label: label || defaultLabels[device.kind],
          deviceId,
          groupId,
          _current: settings[device.kind] === deviceId}
        );
      });

      // clear device settings if device no longer present
      if (
        settings.videoinput &&
        sources.videoinput &&
        !sources.videoinput.find(device => device.deviceId === settings.videoinput)
      ) {
        settings.videoinput = null;
      }
      if (
        settings.audioinput &&
        sources.audioinput &&
        !sources.audioinput.find(device => device.deviceId === settings.audioinput)
      ) {
        settings.audioinput = null;
      }

      // set defaults
      if (!settings.audioinput && sources.audioinput.length) {
        settings.audioinput = sources.audioinput[0].deviceId;
      }
      if (!settings.videoinput && sources.videoinput.length) {
        settings.videoinput = sources.videoinput[0].deviceId;
      }
      b8r.set('webrtc-devices.sources', sources);
      const webrtc_devices = b8r.get('webrtc-devices');
      listeners.forEach(listener => listener(webrtc_devices));
    }
  );
};

const saveSettings = b8r.debounce(
  () => {
    console.log('saving webrtc-devices.settings');
    listeners.forEach(listener => listener(b8r.get(settings_path)));
    localStorage.setItem(settings_path, b8r.getJSON(settings_path));
  },
  100
);

b8r.observe('webrtc-devices.settings', saveSettings);

if (navigator.mediaDevices.addEventListener) {
  navigator.mediaDevices.addEventListener('devicechange', update);
} else if (navigator.mediaDevices) {
  navigator.ondevicechange = update;
}

update();

module.exports = {
  update,
  addListener,
  removeListener,
};

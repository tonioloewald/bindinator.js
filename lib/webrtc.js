/**
# webrtc

webrtc configuration with localStorage persistence
*/
/* global require, module, console */
'use strict';

const settings_path = 'webrtc-devices.settings';
const b8r = require('../source/b8r.js');
const listeners = [];
const {desktopCapturer} = require.electron ? require.globalRequire('electron') : {desktopCapturer: false};

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

const sort_devices = ds => ds.sort((a, b) =>
  // Since we include desktop sources (windows and screens), this is a more friendly order than the
  // arbitrary way they come back from enumerateDevices()
  //
  // Could go wrong if there's more than one device called 'Default' in a given list, but that
  // shouldn't happen in practice and it wouldn't be a big deal anyway.
  //
  a.label === 'Default' ? -1
  : b.label === 'Default' ? 1
  : a.type === b.type ? (a.label || '').localeCompare(b.label)
  : (a.type || '').localeCompare(b.type)
)

let first_load = true;

const update_media_devices = desktopSources => {
  navigator.mediaDevices.enumerateDevices().
  then(
    devices => {
      const type = 'local';
      const sources = {
        audioinput: [],
        videoinput: [],
        audiooutput: []
        // There appears to be no such thing as “videooutput” - I suppose you're supposed to assume
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
            type
          }
        );
      });

      if (sources.videoinput.length === 0) {
        // This is a fake video source so that we know there is no camera on this machine. s
        sources.videoinput.push({deviceId: null, label: 'no camera', type: 'local'});
      }

      desktopSources.forEach(source => sources.videoinput.push(source));

      for (const k in sources) { sort_devices(sources[k]); }

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

      if (!settings.audioinput && sources.audioinput.length) {
        // Until we implement BOT-609, the only audio sources will be microphones, so switching to
        // default makes sense when one gets unplugged.
        settings.audioinput = sources.audioinput[0].deviceId;
      }
      if (first_load) {
        // Set video defaults only on first load to avoid the creepy unexpected behavior of, for
        // example, automatically publishing your camera when you close a window you were sharing.
        //
        // Refine when we implement BOT-612
        if (!settings.videoinput && sources.videoinput.length) {
          settings.videoinput = sources.videoinput[0].deviceId;
        }
      }
      first_load = false;
      b8r.set('webrtc-devices.sources',
        // For screensharing, force source list to update in settings screen when a window title
        // changes, but the deviceId remains the same. This happens, for example, when you switch
        // tabs in your browser.
        null);
      b8r.set('webrtc-devices.sources', sources);
      const webrtc_devices = b8r.get('webrtc-devices');
      listeners.forEach(listener => listener('devices', webrtc_devices));
    }
  );
};

const update = () => {
  if (desktopCapturer) {
    desktopCapturer.getSources({types: ['window', 'screen']}, (desktopError, desktopSources) => {
      const sources = [];
      desktopSources.forEach(source => {
        sources.push({
          label: source.name,
          deviceId: source.id,
          type: source.id.split(':')[0],
          groupId: '',
          thumbnail: source.thumbnail.toDataURL() || undefined
        });
      });
      update_media_devices(sources);
    });
  } else {
    update_media_devices([]);
  }
};

const saveSettings = b8r.debounce(
  () => {
    console.log('saving webrtc-devices.settings');
    listeners.forEach(listener => listener('settings', b8r.get(settings_path)));

    // We don't to set defaults to an ephemeral device
    const videoId = b8r.get(settings_path).videoinput;
    const videoInput = b8r.get(`webrtc-devices.sources.videoinput[deviceId=${videoId}]`) ||
                       b8r.get('webrtc-devices.sources.videoinput[type=local]');
    const audioId = b8r.get(settings_path).audioinput;
    const audioInput = b8r.get(`webrtc-devices.sources.audioinput[deviceId=${audioId}]`) ||
                       b8r.get('webrtc-devices.sources.audioinput[type=local]');

    if (videoInput.type === 'local' && audioInput.type === 'local') {
      b8r.set(`${settings_path}.videoinput`, videoInput.deviceId);
      b8r.set(`${settings_path}.audioinput`, audioInput.deviceId);
      localStorage.setItem(settings_path, b8r.getJSON(settings_path));
    }
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

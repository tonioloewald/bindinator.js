/**
# Swiss Railway Clock (svg)

<b8r-component style="width: 256px; height: 256px;" path="../components/swiss-clock.js"></b8r-component>

This is yet another analog clock demo, but instead of rendering the clock manually
using canvas commands, it simply binds an SVG.

For extra efficiency, the hour and minute tick marks are list-bindings.
*/

export default {
  css: `
    ._component_ {
      display: inline-block;
      position: relative;
    }

    ._component_ > svg {
      width: 100%;
      height: 100%;
    }

    ._component_ .minute-tick,
    ._component_ .hour-tick {
      fill: #444;
    }

    ._component_ .hour-hand,
    ._component_ .minute-hand {
      fill: #222;
    }

    ._component_ .second-hand {
      fill: #c00;
    }

    ._component_ .pin {
      fill: orange;
    }
  `,
  html: `
<svg width="600px" height="600px" viewBox="0 0 600 600" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <title>Swiss Railway Clock</title>
  <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
    <circle class="face" stroke="#D3D3D3" stroke-width="16.90" fill="#FFFFFF" fill-rule="nonzero" cx="300" cy="300" r="291.54"></circle>
    <polygon class="minute-tick" data-list="_component_.minutes" data-bind="_component_.rotate=.angle" fill-rule="nonzero" points="303.91 36.26 296.08 36.26 296.08 58.26 303.91 58.26"></polygon>
    <polygon class="hour-tick" data-list="_component_.hours" data-bind="_component_.rotate=.angle" fill-rule="nonzero" points="289.43 35.91 310.56 35.91 310.56 100.61 289.43 100.61"></polygon>
    <polygon class="hour-hand" data-bind="_component_.rotate=_component_.hourAngle" fill-rule="nonzero" points="286.17 127.81 312.58 127.81 315.22 362.85 283.53 362.85"></polygon>
    <polygon class="minute-hand" data-bind="_component_.rotate=_component_.minuteAngle" fill-rule="nonzero" points="289.21 46.22 310.34 46.22 312.98 363.12 286.57 363.12"></polygon>
    <path class="second-hand" data-bind="_component_.rotate=_component_.secondAngle" d="M300,102.93 C315.31,102.93 327.72,115.35 327.72,130.66 C327.72,145.08 316.72,156.92 302.66,158.26 L304.48,390.78 L296.56,390.78 L294.73,157.89 C281.93,155.43 272.27,144.17 272.27,130.66 C272.27,115.35 284.68,102.93 300,102.93 Z" fill-rule="nonzero"></path>
    <circle class="pin" fill-rule="nonzero" cx="300" cy="300" r="1.32"></circle>
  </g>
</svg>
`,
  initialValue({component, get, set}) {
    const update = () => {
      if (component.closest('body')) {
        if (get().updateActive) {
          get().setTime(new Date())
        }
      } else {
        clearInterval(interval)
      }
    }
    const minutes = []
    const hours = []
    for (let min = 0; min < 60; min++) {
      const tick = {angle: min * 6}
      if (min % 5) {
        minutes.push(tick)
      } else {
        hours.push(tick)
      }
    }
    const interval = setInterval(update, 500)
    const angles = time => ({     
      hourAngle: time.getHours() * 30 + time.getMinutes() * 0.5,
      minuteAngle: time.getMinutes() * 6 + time.getSeconds() * 0.1,
      secondAngle: time.getSeconds() * 6,
    })
    const time = new Date()
    return {
      updateActive: true,
      time,
      minutes,
      hours,
      ...angles(time),
      setTime(time) {
        set({
          time,
          ...angles(time)
        })
      },
      rotate(element, angle) {
        element.setAttribute('transform', `rotate(${angle}, 300, 300)`)
      },
    }
  }
}
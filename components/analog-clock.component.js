/**
# Analog Clock

<b8r-component
  name="analog-clock-js"
  path="../components/analog-clock.component.js"
>
</b8r-component>

Here's a pure JS version of the old analog clock component.
*/

const colors = [
  { description: 'very dark grey', value: '#222' },
  { description: 'dark grey', value: '#444' },
  { description: 'grey', value: '#666' },
  { description: 'light grey', value: '#ddd' },
  { description: 'off-white', value: '#f7f7f7' },
  { description: 'red', value: 'blue' },
  { description: 'green', value: 'blue' },
  { description: 'blue', value: 'blue' }
]

const timePartsRegEx = /\d+|AM|PM/g

const localTime = () => {
  return new Date().toLocaleString('en-US').split(',').pop().match(timePartsRegEx)
}

const fiveSecondsToMidnight = () => [11, 59, 55, 'PM']

const drinkOClock = () => [5, 0, 15, 'PM']

export const timeFromTimezone = timezone => {
  return () => () => new Date().toLocaleString('en-US', { timezone }).split(',').pop().match(timePartsRegEx)
}

const zuluTime = () => timeFromTimezone('Zulu')
const sydneyTime = () => timeFromTimezone('Australia/Sydney')

export const configuration = [
  {
    name: 'faceColor',
    values: colors
  },
  {
    name: 'tickColor',
    values: colors
  },
  {
    name: 'handColor',
    values: colors
  },
  {
    name: 'secondHandColor',
    values: colors
  },
  {
    name: 'logoUrl',
    values: [
      { description: 'no logo', value: null },
      { description: 'b8r logo greyscale', value: 'images/bindinator-logo-notext-mono.svg' }
    ]
  },
  {
    name: 'getHMS',
    values: [
      { description: 'local time', value: localTime },
      { description: 'time in Sydney', value: sydneyTime },
      { description: 'GMT', value: zuluTime },
      { description: 'five seconds to midnight', value: fiveSecondsToMidnight },
      { description: 'it’s 5PM somewhere…', value: drinkOClock }
    ]
  }
]

export const examples = [
  {
    name: 'local time',
    skipSnapshot: true
  },
  {
    skipSnapshot: true,
    name: 'no logo',
    settings: [
      { name: 'logoUrl', option: 0 }
    ]
  },
  {
    name: 'Sydney Time',
    skipSnapshot: true,
    settings: [
      { name: 'getHMS', option: 2 }
    ]
  },
  {
    name: 'GMT',
    skipSnapshot: true,
    settings: [
      { name: 'getHMS', option: 2 }
    ]
  },
  {
    name: 'fixed time (5PM)',
    settings: [
      { name: 'getHMS', option: 3 }
    ]
  },
  {
    name: 'fixed time (5 seconds to midnight)',
    settings: [
      { name: 'getHMS', option: 4 }
    ]
  }
]

export default {
  css: `
    ._component_ canvas { width: 128px; height: 128px; }
  `,
  view: ({canvas}) => canvas( { 
    'bindAttr(aria-label),attr(title)': 'clock showing {{_component_.time}}',
    width: 256,
    height: 256,
  } ),
  initialValue: {
    faceColor: '#f7f7f7',
    tickColor: '#222',
    handColor: '#444',
    secondHandColor: 'red',
    logoUrl: 'images/bindinator-logo-notext-mono.svg',
    getHMS: localTime
  },
  load: async ({ get, set, findOne }) => {
    /* global Image */
    const { domInterval } = await import('../lib/dom-timers.js')
    const { getHMS, faceColor, tickColor, handColor, secondHandColor, logoUrl } = get()

    const clock = findOne('canvas')
    const g = clock.getContext('2d')
    let logo = false
    if (logoUrl) {
      logo = new Image()
      logo.src = logoUrl
    }
    g.fillStyle = faceColor
    const d2r = Math.PI / 180
    const drawRay = (width, angle, r0, r1, color = tickColor) => {
      g.strokeStyle = color
      g.lineWidth = width
      const radians = angle * d2r
      const sinR = Math.sin(radians)
      const cosR = Math.cos(radians)
      const x0 = 128 + r0 * sinR
      const y0 = 128 - r0 * cosR
      const x1 = 128 + r1 * sinR
      const y1 = 128 - r1 * cosR
      g.beginPath()
      g.moveTo(x0, y0)
      g.lineTo(x1, y1)
      g.stroke()
    }

    const update = () => {
      const [hours, minutes, seconds, pm] = getHMS()
      const timeText = `${hours}:${minutes}:${seconds} ${pm}`
      if (timeText !== get('time')) {
        set('time', timeText)
        g.clearRect(0, 0, 256, 256)
        g.beginPath()
        g.ellipse(128, 128, 128, 128, 0, 0, 2 * Math.PI)
        g.fill()
        g.drawImage(logo, 108, 160, 40, 29)
        for (let h = 0; h < 12; h++) {
          drawRay(6, h * 30, 96, 120, handColor)
        }
        const hourHand = (parseInt(hours, 10) % 12 * 30) + parseInt(minutes, 10) * 0.5
        const minuteHand = parseInt(minutes, 10) * 6 + parseInt(seconds, 10) * 0.1
        const secondHand = parseInt(seconds, 10) * 6 // + now.getMilliseconds() * 0.006;
        drawRay(6, hourHand, 0, 80)
        drawRay(4, minuteHand, 0, 116)
        drawRay(2, secondHand, 0, 116, secondHandColor)
      }
    }
    domInterval(clock, update, 16.6)
  }
}

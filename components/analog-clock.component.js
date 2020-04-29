/**
# Analog Clock

<b8r-component
  name="analog-clock-js"
  path="../components/analog-clock.component.js"
>
</b8r-component>

Here's a pure JS version of the old analog clock component.
*/

export default {
  css: `
    ._component_ canvas { width: 128px; height: 128px; }
  `,
  html: `
    <canvas
      data-bind="
        attr(aria-label),attr(title)=clock showing $\{_component_.time}
      "
      width="256" height="256"
    ></canvas>`,
  load: async ({ get, set, findOne }) => {
    /* global Image */
    const { domInterval } = await import('../lib/dom-timers.js')

    const clock = findOne('canvas')
    const g = clock.getContext('2d')
    const logo = new Image()
    logo.src = 'images/bindinator-logo-notext-mono.svg'
    g.fillStyle = '#f7f7f7'
    const d2r = Math.PI / 180
    const drawRay = (width, angle, r0, r1, color = '#222') => {
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
      const now = new Date()
      const timeText = now.toLocaleTimeString()
      if (timeText !== get('time')) {
        set('time', timeText)
        g.clearRect(0, 0, 256, 256)
        g.beginPath()
        g.ellipse(128, 128, 128, 128, 0, 0, 2 * Math.PI)
        g.fill()
        g.drawImage(logo, 108, 160, 40, 29)
        for (let h = 0; h < 12; h++) {
          drawRay(6, h * 30, 96, 120, '#444')
        }
        const hourHand = (now.getHours() % 12 * 30) + now.getMinutes() * 0.5
        const minuteHand = now.getMinutes() * 6 + now.getSeconds() * 0.1
        const secondHand = now.getSeconds() * 6 // + now.getMilliseconds() * 0.006;
        drawRay(6, hourHand, 0, 80)
        drawRay(4, minuteHand, 0, 116)
        drawRay(2, secondHand, 0, 116, 'red')
      }
    }
    domInterval(clock, update, 16.6)
  }
}

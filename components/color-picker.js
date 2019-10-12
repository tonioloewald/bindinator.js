/**
# Color Picker

This `color-picker` component is a replacement for `<input type="color">` that provides
a graphical hsva (hue, saturation, value, alpha) color picker. It opens when focused.

You can bind to the component's `value` as if it were a native input.

<b8r-component path="../components/color-picker.js"></b8r-component>

You can use the `data-increments` attribute to change the color precision. (By default it is 24.)
And you can use the `data-open` attribute to keep it open all the time.

<b8r-component path="../components/color-picker.js" data-open data-increments=256></b8r-component>
*/

import b8r from '../source/b8r.js'
import { parse } from '../lib/color.js'

function interpolate (t, pointList) {
  const upperBoundIndex = pointList.findIndex(([x]) => x >= t)
  if (upperBoundIndex === -1) {
    return pointList[pointList.length - 1][1]
  } else if (upperBoundIndex === 0) {
    return pointList[0][1]
  } else {
    const lowerBound = pointList[upperBoundIndex - 1]
    const upperBound = pointList[upperBoundIndex]
    const t0 = (t - lowerBound[0]) / (upperBound[0] - lowerBound[0])
    return lowerBound[1] * (1 - t0) + upperBound[1] * t0
  }
}

function hsva2rgba (hue, saturation = 1, value = 1, opacity = 1) {
  const grey = (1 - saturation) * value * 255
  saturation *= value
  const red = interpolate(hue, [[60, 255], [120, 0], [240, 0], [300, 255]]) * saturation + grey
  const green = interpolate(hue, [[0, 0], [60, 255], [180, 255], [240, 0]]) * saturation + grey
  const blue = interpolate(hue, [[120, 0], [180, 255], [300, 255], [360, 0]]) * saturation + grey
  return `rgba(${red},${green},${blue},${opacity})`
}

b8r.register('color-picker-controller', {
  pickColor: (evt, elt) => {
    if (evt.type === 'mousemove' && evt.buttons !== 1) {
      return
    }
    const componentId = b8r.getComponentId(elt)
    let { h, s, v, a, increments } = b8r.getComponentData(elt)
    const { offsetX, offsetY } = evt
    const x = Math.floor(offsetX * (increments + 1) / elt.offsetWidth)
    const y = Math.floor(offsetY * 4 / elt.offsetHeight)
    switch (y) {
      case 0:
        h = x / increments * 360
        break
      case 1:
        s = x / increments
        break
      case 2:
        v = x / increments
        break
      default:
        a = x / increments
        break
    }
    b8r.set(componentId, { h, s, v, a, value: hsva2rgba(h, s, v, a) })
    b8r.trigger('change', elt)
  },
  palette: (canvas, [h, s, v]) => {
    const { increments } = b8r.getComponentData(canvas)
    const width = increments + 1
    const height = 4
    canvas.width = width
    canvas.height = height
    const g = canvas.getContext('2d')
    g.clearRect(0, 0, width, height)
    for (let x = 0; x <= width; x++) {
      g.fillStyle = hsva2rgba(x * 360 / increments)
      g.fillRect(x, 0, 1, 1)
      g.fillStyle = hsva2rgba(h, x / increments)
      g.fillRect(x, 1, 1, 1)
      g.fillStyle = hsva2rgba(h, s, x / increments)
      g.fillRect(x, 2, 1, 1)
      g.fillStyle = hsva2rgba(h, s, v, x / increments)
      g.fillRect(x, 3, 1, 1)
    }
  }
})

const diagonalStripes = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAGKADAAQAAAABAAAAGAAAAADiNXWtAAAAjklEQVRIDbXTWwrAIAxEUdvtuDIX7HoqI1QQHwnJJCD0o5wbP3xKKV9STs454Win1ppe7c8WXB2w4lhevIEHFwNe/Bpg4McAC98GmPgSYONTIAIfgSi8ByLxEcCHZvD0cbSD5cWX/GMWXB2w4lhOvIEHFwNe/Bpg4McAC98GmPgSYONTIAIfgSi8ByJxBBqcr4/rC7K9hgAAAABJRU5ErkJggg=='

export const colorPicker = b8r.makeComponentNoEval('color-picker', {
  css: `
    ._component_ {
      position: relative;
      min-width: 240px;
      cursor: default;
      user-select: none;
    }

    ._component_ .diagonal-stripes {
      background: url(${diagonalStripes});
    }

    ._component_ > div {
      margin: 0;
      padding: 0;
      line-height: 24px;
      text-align: center;
    }

    ._component_ > div > .swatch {
      display: inline-block;
      margin: 0;
      padding: 0;
      width: 4%;
      height: 100%;
      border-radius: 0;
    }

    ._component_ canvas {
      background: url(${diagonalStripes});
      position: relative;
      transition: 0.25s ease-in-out;
      opacity: 0;
      height: 0;
      width: 100%;
      display: block;
      image-rendering: pixelated;
    }

    ._component_:focus canvas,
    ._component_[data-open] canvas {
      opacity: 1;
      height: 96px;
    }
  `,
  html: `
    <div class="diagonal-stripes" style="padding: 5px;">
        <span class="swatch" data-bind="style(background)=_component_.value" style="width: 25%">&nbsp;</span>
    </div>
    <canvas 
      data-bind="method(color-picker-controller.palette)=_component_.h,_component_.s,_component_.v"
      data-event="mousedown,mousemove,mouseup:color-picker-controller.pickColor"
    ></canvas>
  `,
  load: async ({
    component, // this is the element that the component is inserted into
    b8r, // it's b8r!
    find, // b8r.findWithin(component, ...)
    findOne, // b8r.findOneWithin(component, ...)
    data, // the component's private data object
    register, // replace the component's private data object
    get, // get (within the component's private data)
    set, // set (within the component's private data)
    on, // b8r.on(component, ...)
    touch // refresh the component
  }) => {
    component.setAttribute('tabindex', 0)
    const { value } = data
    const c = parse(value || 'red')
    const { h, s, v, a } = c.hsv()
    set({
      increments: parseInt(component.dataset.increments || 24, 0),
      value: value || 'red',
      h,
      s,
      v,
      a
    })
  }
})

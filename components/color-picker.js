/**
# Color Picker

<b8r-component path="../components/color-picker.js"></b8r-component>
*/

import b8r from '../source/b8r.js'

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

function range (min = 0, max = 24, step = 1) {
  const r = []
  for (let i = min; i <= max; i += step) {
    r.push(i)
  }
  return r
}

function hsva2rgba (hue, saturation, value, opacity) {
  const grey = (1 - saturation) * value * 255
  saturation *= value
  const red = interpolate(hue, [[60, 255], [120, 0], [240, 0], [300, 255]]) * saturation + grey
  const green = interpolate(hue, [[0, 0], [60, 255], [180, 255], [240, 0]]) * saturation + grey
  const blue = interpolate(hue, [[120, 0], [180, 255], [300, 255], [360, 0]]) * saturation + grey
  return `rgba(${red},${green},${blue},${opacity})`
}

const increments = range(0, 24, 1)

const updateColor = (evt, field) => {
  const { target } = evt
  const value = b8r.getListInstance(target).v
  const componentId = b8r.getComponentId(target)
  let { h, s, v, a } = b8r.get(componentId)
  switch (field) {
    case 'h':
      h = value
      s = v = a = 1
      break
    case 's':
      s = value
      v = a = 1
      break
    case 'v':
      v = value
      a = 1
      break
    default:
      a = value
      break
  }
  b8r.set(componentId, { h, s, v, a, value: hsva2rgba(h, s, v, a) })
}

b8r.register('color-picker-controller', {
  swatch: (elt, args) => {
    elt.style.background = hsva2rgba(...args.map(parseFloat))
  },
  hues: increments.map(x => ({ v: x * 15 })),
  values: increments.map(x => ({ v: x / 24 })),
  one: 1,
  pickHue: (evt) => updateColor(evt, 'h'),
  pickSat: (evt) => updateColor(evt, 's'),
  pickValue: (evt) => updateColor(evt, 'v'),
  pickAlpha: (evt) => updateColor(evt, 'a')
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

    ._component_ > *+* {
      position: relative;
      transition: 0.25s ease-in-out;
      opacity: 0;
      height: 0;
    }

    ._component_:focus > *+* {
      opacity: 1;
      height: 24px;
    }
  `,
  html: `
    <div class="diagonal-stripes" style="padding: 5px;">
        <span class="swatch" data-bind="style(background)=_component_.value" style="width: 25%">&nbsp;</span>
    </div>
    <div data-event="click:color-picker-controller.pickHue">
        <span data-list="color-picker-controller.hues" data-bind="method(color-picker-controller.swatch)=.v,color-picker-controller.one,color-picker-controller.one,color-picker-controller.one" class="swatch">&nbsp;</span>
    </div>
    <div data-event="click:color-picker-controller.pickSat">
        <span data-list="color-picker-controller.values" data-bind="method(color-picker-controller.swatch)=_component_.h,.v,color-picker-controller.one,color-picker-controller.one" class="swatch">&nbsp;</span>
    </div>
    <div data-event="click:color-picker-controller.pickValue">
        <span data-list="color-picker-controller.values" data-bind="method(color-picker-controller.swatch)=_component_.h,_component_.s,.v,color-picker-controller.one" class="swatch">&nbsp;</span>
    </div>
    <div class="diagonal-stripes" data-event="click:color-picker-controller.pickAlpha">
        <span data-list="color-picker-controller.values" data-bind="method(color-picker-controller.swatch)=_component_.h,_component_.s,_component_.v,.v" class="swatch">&nbsp;</span>
    </div>
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
    set({
      value: component.dataset.value || 'red',
      h: 180,
      s: 1,
      v: 1,
      a: 1
    })
  }
})

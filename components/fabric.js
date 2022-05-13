/**
# image-editor

This is an **image-editor** built around [fabricjs](http://fabricjs.com/). It implements undo/redo
by leveraging fabricjs's serialization (`toJSON`, `loadFromJSON`) methods.

The editor can be configured to edit a specified image using the `data-image-url` attribute or
by using the `init` method.

Any children of the editor will be added to its "toolbar", which is by default at the top. If
you set the component's style to "flex-direction: column-reverse" then the bar will be at the bottom.

<b8r-component path="../components/fabric.js" data-image-url="/test/portraits/weasel.png" style="height: 400px">
  <button data-event="click:_component_.addRect">Rect</button>
  <button data-event="click:_component_.addText">Text</button>
  <button data-event="click:_component_.toggleDraw" data-stroke="2,#11ad">Pen</button>
  <button data-event="click:_component_.toggleDraw" data-stroke="20,#ff04">Hiliter</button>
  <span class="spacer"></span>
  <button data-event="click:_component_.zoom">Fit</button>
  <button data-event="click:_component_.zoom" data-scale="1">100%</button>
  <span class="spacer"></span>
  <button data-bind="enabled_if=_component_.hasSelection" data-event="click:_component_.moveToBack">Back</button>
  <button data-bind="enabled_if=_component_.hasSelection" data-event="click:_component_.moveToFront">Front</button>
  <button data-bind="enabled_if=_component_.hasSelection" data-event="click:_component_.deleteSelection">Delete</button>
  <span class="elastic"></span>
  <button data-event="click:_component_.export">Export</button>
  <span class="spacer"></span>
  <button data-bind="enabled_if=_component_.canUndo" data-event="click:_component_.undo"><span class="icon-undo"></span></button>
  <button data-bind="enabled_if=_component_.undoDepth" data-event="click:_component_.redo"><span class="icon-redo"></span></button>
</b8r-component>
*/

import { viaTag } from '../lib/scripts.js'
import { imagePromise } from '../source/b8r.imgSrc.js'

function clamp(x, min, max) {
  if (max < min) {
    [max, min] = [min, max]
  }
  return x < min ? min : (x > max ? max : x)
}

export default {
  css: `
    ._component_ {
      display: flex;
      flex-direction: column;
      background: #444;
      overflow: hidden;
      position: relative;
    }

    ._component_ * {
      color: #eee;
    }

    ._component_ > canvas {
      width: 100%;
      height: 100%;
    }

    ._component_ .row {
      display: flex;
      flex: 0 0 auto;
    }

    ._component_ .elastic {
      flex: 1 1 auto;
    }

    ._component_ .row > button {
      border: none;
      background: none;
      border-radius: 0;
      box-shadow: none;
    }

    ._component_ .row > button:active,
    ._component_ .row > button.active {
      background: var(--accent-color);
      color: var(--accent-text-color);
    }

    ._component_ .spacer {
      width: 10px;
      flex: 0 0 auto;
    }

    ._component_ .container {
      flex: 1 1 auto;
      position: relative;
    }
  `,
  html: `
    <div data-children class="row"></div>
    <div class="elastic container" data-event="touchstart,touchmove,touchend:_component_.touchMove"></div>
  `,
  async initialValue ({ b8r, component, findOne, find, get, set }) {
    await viaTag('https://cdnjs.cloudflare.com/ajax/libs/fabric.js/521/fabric.min.js')
    b8r.onAny('keydown(Backspace)', `${component.dataset.componentId}.deleteSelection`)
    b8r.implicitlyHandleEventsOfType('touchstart')
    b8r.implicitlyHandleEventsOfType('touchmove')
    b8r.implicitlyHandleEventsOfType('touchend')
    const container = findOne('.container')

    const trackState = () => {
      const { skipTracking, undoBuffer, fabricCanvas } = get()
      if (skipTracking) {
        return
      }
      undoBuffer.splice(0, get().undoDepth)
      undoBuffer.unshift(fabricCanvas.toObject())
      set({ undoBuffer, canUndo: true, undoDepth: 0 })
    }

    const panZoom = function (opt) {
      const delta = -opt.e.wheelDeltaY * 0.25

      const { fabricCanvas, zoomToPoint } = get()
      const minScale = get().minScale()
      const {width, height} = fabricCanvas
      let zoom = fabricCanvas.getZoom()
      zoom *= 0.999 ** delta
      zoomToPoint(opt.e.offsetX, opt.e.offsetY, -opt.e.deltaX, -opt.e.deltaY, zoom)

      if (opt.e.stopPropagation) {
        opt.e.preventDefault()
        opt.e.stopPropagation()
      }
    }

    return {
      async init(image) {
        set({ skipTracking: true })

        container.textContent = ''
        const canvas = b8r.create('canvas')
        container.append(canvas)
        if (typeof image === 'string') {
          image = await imagePromise(image)
        }
        let baseImage = null
        const width = image ? image.width : canvas.offsetWidth
        const height = image ? image.height : canvas.offsetHeight

        const fabricCanvas = new fabric.Canvas(canvas, {
          backgroundColor: '#888',
          selectionColor: '#0ff8',
          selectionLineWidth: 2,
          width,
          height
        })

        if (image) {
          baseImage = new fabric.Image(image, {
            left: 0,
            top: 0,
            angle: 0,
            opacity: 1,
            selectable: false,
            hoverCursor: 'default',
          })
          fabricCanvas.add(baseImage)
        }

        const undoBuffer = [fabricCanvas.toObject()]

        fabricCanvas.on('selection:created', () => { set({ hasSelection: true }) })
        fabricCanvas.on('selection:cleared', () => { set({ hasSelection: false }) })
        fabricCanvas.on('object:modified', trackState)
        fabricCanvas.on('object:added', trackState)
        fabricCanvas.on('object:removed', trackState)
        fabricCanvas.on('mouse:wheel', panZoom)

        set({
          fabricCanvas,
          undoBuffer,
          canUndo: false,
          undoDepth: 0,
          baseImage, 
          skipTracking: false
        })
      },
      defaultShape: {
        width: 100,
        height: 100,
        left: 100,
        top: 100,
        strokeUniform: true
      },
      settings: {
        strokeWidth: 2,
        stroke: '#f008',
        fill: '#f00d'
      },
      skipTracking: false,
      canUndo: false,
      addRect () {
        const { fabricCanvas } = get()
        get().exitDraw()
        fabricCanvas.discardActiveObject()
        const rect = new fabric.Rect({
          ...get().defaultShape,
          ...get().settings,
          selectable: true
        })
        fabricCanvas.add(rect)
        fabricCanvas.setActiveObject(rect)
      },
      addText () {
        const { fabricCanvas } = get()
        get().exitDraw()
        fabricCanvas.discardActiveObject()
        const message = window.prompt('Enter text', 'edit this text')
        if (!message) {
          return
        }
        const text = new fabric.Text(message, {
          ...get().defaultShape,
          backgroundColor: '#fffd',
          fill: '#11ad',
          fontFamily: 'Sans-serif'
        })
        fabricCanvas.add(text)
        fabricCanvas.setActiveObject(text)
      },
      hasSelection: false,
      drawingMode: false,
      lockBaseImage () {
        const { baseImage, fabricCanvas } = get()
        if (baseImage) {
          fabricCanvas.getObjects()[0].selectable = false
          fabricCanvas.getObjects()[0].hoverCursor = 'default'
        }
      },
      lastTouch: null,
      touchMove (evt) {
        const { lastTouch, fabricCanvas, zoomToPoint } = get()
        let zoom = fabricCanvas.getZoom()
        if (evt.touches.length !== 2) {
          set({ lastTouch: null })
        } else {
          const [a, b] = evt.touches
          const x = (a.clientX + b.clientY) * 0.5
          const y = (a.clientY + b.clientY) * 0.5
          const touch = {
            x,
            y,
            size: Math.sqrt(Math.pow(a.clientX - b.clientX, 2) + Math.pow(a.clientY - b.clientY, 2)),
            scale: zoom
          }
          if (lastTouch) {
            zoom *= touch.size / lastTouch.size
            zoomToPoint(x, y, touch.x - lastTouch.x, touch.y - lastTouch.y, zoom)
          }
          set({ lastTouch: touch })
        }
        return true
      },
      zoomToPoint(x, y, deltaX, deltaY, zoom) {
        const {fabricCanvas} = get()
        const minScale = get().minScale()
        const {width, height} = fabricCanvas

        zoom = clamp(zoom, minScale, 4)
        fabricCanvas.zoomToPoint({x, y}, zoom)
        const {offsetWidth, offsetHeight} = container
        const _x = fabricCanvas.viewportTransform[4] + deltaX
        const _y = fabricCanvas.viewportTransform[5] + deltaY
        fabricCanvas.viewportTransform[4] = clamp(_x, offsetWidth - zoom * width, 0)
        fabricCanvas.viewportTransform[5] = clamp(_y, offsetHeight - zoom * height, 0)
      },
      undo () {
        get().exitDraw()
        let { undoDepth, undoBuffer, fabricCanvas, lockBaseImage } = get()
        set({ skipTracking: true })
        undoDepth += 1
        fabricCanvas.loadFromJSON(undoBuffer[undoDepth], () => {
          lockBaseImage()
          set({
            undoDepth,
            canUndo: undoDepth < undoBuffer.length - 1,
            skipTracking: false
          })
        })
      },
      redo () {
        get().exitDraw()
        let { undoBuffer, fabricCanvas, undoDepth, lockBaseImage } = get()
        set({ skipTracking: true })
        undoDepth -= 1
        fabricCanvas.loadFromJSON(undoBuffer[undoDepth], () => {
          lockBaseImage()
          set({
            undoDepth,
            canUndo: true,
            skipTracking: false
          })
        })
      },
      toggleDraw (evt) {
        let { drawingMode, fabricCanvas } = get()
        if (drawingMode === evt.target.textContent) {
          drawingMode = fabricCanvas.isDrawingMode ? false : evt.target.textContent
        } else {
          drawingMode = evt.target.textContent
        }
        const [width, color] = evt.target.dataset.stroke.split(',')
        const brush = fabricCanvas.freeDrawingBrush
        brush.color = color
        brush.width = Number(width)
        set({ drawingMode })
        fabricCanvas.isDrawingMode = !!drawingMode
        find('[data-stroke]').forEach(elt => {
          elt.classList.toggle('active', elt.textContent === drawingMode)
          console.log(drawingMode, elt.textContent, elt.textContent === drawingMode)
        })
      },
      minScale() {
        const {fabricCanvas} = get()
        return Math.min(1, container.offsetWidth / fabricCanvas.getWidth(), container.offsetHeight / fabricCanvas.getHeight())
      },
      zoom (evt) {
        const { fabricCanvas } = get()
        let scale = Number(evt.target.dataset.scale)
        if (!scale) {
          scale = get().minScale()
        }
        const x = (container.offsetWidth - (scale * fabricCanvas.getWidth())) * 0.5
        const y = (container.offsetHeight - (scale * fabricCanvas.getHeight())) * 0.5
        fabricCanvas.setZoom(Number(scale))
        fabricCanvas.viewportTransform[4] = x
        fabricCanvas.viewportTransform[5] = y
      },
      exitDraw () {
        const { fabricCanvas } = get()
        fabricCanvas.isDrawingMode = false
        set({ drawingMode: false })
      },
      moveToFront () {
        const { fabricCanvas } = get()
        fabricCanvas.bringToFront(fabricCanvas.getActiveObject())
      },
      moveToBack () {
        const { fabricCanvas, baseImage } = get()
        fabricCanvas.sendToBack(fabricCanvas.getActiveObject())
        if (baseImage) {
          fabricCanvas.bringForward(fabricCanvas.getActiveObject())
        }
        fabricCanvas.discardActiveObject()
      },
      deleteSelection () {
        const { fabricCanvas } = get()
        fabricCanvas.remove(fabricCanvas.getActiveObject())
        return true
      },
      destroy () {
        b8r.offAny('keydown(Backspace)', `${component.dataset.componentId}.deleteSelection`)
      },
      export () {
        const { fabricCanvas } = get()
        const savedTransform = [...fabricCanvas.viewportTransform]
        const scale = fabricCanvas.getZoom()

        fabricCanvas.setZoom(1)
        fabricCanvas.viewportTransform[4] = 0
        fabricCanvas.viewportTransform[5] = 0
        const dataUrl = fabricCanvas.toDataURL()
        fabricCanvas.setZoom(scale)
        fabricCanvas.viewportTransform = savedTransform
        const w = window.open()
        const img = w.document.createElement('img')
        img.src = dataUrl
        w.document.body.append(img)
      }
    }
  },
  async load({component, get}){
    const { imageUrl } = component.dataset
    get().init(imageUrl)
  }
}

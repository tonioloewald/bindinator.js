/**
# image-editor

This is an **image-editor** built around [fabricjs](http://fabricjs.com/). It implements undo/redo
by leveraging fabricjs's serialization (`toJSON`, `loadFromJSON`) methods.

The editor can be configured to edit a specified image using the `data-image-url` attribute or
by using the `init` method.

<b8r-component path="../components/fabric.js" data-image-url="/test/portraits/weasel.png">
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

import {viaTag} from '../lib/scripts.js'
import {imagePromise} from '../source/b8r.imgSrc.js'

export default {
  css: `
    ._component_ {
      display: flex;
      flex-direction: column;
      background: #444;
      overflow: hidden;
      min-height: 400px;
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
      position: relative;
    }
  `,
  html: `
    <div data-children class="row"></div>
    <div class="elastic container"></div>
  `,
  async initialValue({b8r, component, findOne, find, get, set}) {
    await viaTag('https://cdnjs.cloudflare.com/ajax/libs/fabric.js/521/fabric.min.js')
    b8r.onAny('keydown(Backspace)', `${component.dataset.componentId}.deleteSelection`)

    const {imageUrl} = component.dataset
    const container = findOne('.container')

    const trackState = () => {
      const {skipTracking, undoBuffer, fabricCanvas} = get()
      if (skipTracking) {
        return
      }
      undoBuffer.splice(0, get().undoDepth)
      undoBuffer.unshift(fabricCanvas.toObject())
      set({undoBuffer, canUndo: true, undoDepth: 0})
    }

    const panZoom = function(opt) {
      const delta = -opt.e.wheelDeltaY * 0.25

      let zoom = this.getZoom()
      zoom *= 0.999 ** delta
      if (zoom > 20) zoom = 20
      if (zoom < 0.01) zoom = 0.01
      this.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom)

      this.viewportTransform[4] -= opt.e.deltaX
      this.viewportTransform[5] -= opt.e.deltaY

      opt.e.preventDefault()
      opt.e.stopPropagation()
    }

    const init = async image => {
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
          hoverCursor: 'default'
        })
        fabricCanvas.add(baseImage)
      }

      const undoBuffer = [fabricCanvas.toObject()]

      fabricCanvas.on('selection:created', () => { set({hasSelection: true}) })
      fabricCanvas.on('selection:cleared', () => { set({hasSelection: false}) })
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
      })
    }

    init(imageUrl)

    return {
      defaultShape: {
        width: 100,
        height: 100,
        left: 100,
        top: 100,
        strokeUniform: true,
      },
      settings: {
        strokeWidth: 2,
        stroke: '#f008',
        fill: '#f00d',
      },
      skipTracking: false,
      canUndo: false,
      init,
      addRect() {
        const {fabricCanvas} = get()
        get().exitDraw()
        fabricCanvas.discardActiveObject()
        const rect = new fabric.Rect({
          ...get().defaultShape,
          ...get().settings,
          selectable: true,
        })
        fabricCanvas.add(rect)
        fabricCanvas.setActiveObject(rect)
      },
      addText () {
        const {fabricCanvas} = get()
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
        });
        fabricCanvas.add(text)
        fabricCanvas.setActiveObject(text)
      },
      hasSelection: false,
      drawingMode: false,
      undo () {
        let {undoDepth, undoBuffer, fabricCanvas} = get()
        set({skipTracking: true})
        undoDepth += 1
        fabricCanvas.loadFromJSON(undoBuffer[undoDepth])
        window.requestAnimationFrame(() => {
          set({
            undoDepth,
            canUndo: undoDepth < undoBuffer.length - 1,
            skipTracking: false
          })
        })
      },
      redo () {
        let {undoBuffer, fabricCanvas, undoDepth} = get()
        set({skipTracking: true})
        undoDepth -= 1
        fabricCanvas.loadFromJSON(undoBuffer[undoDepth])
        window.requestAnimationFrame(() => {
          set({
            undoDepth,
            canUndo: true,
            skipTracking: false
          })
        })
      },
      toggleDraw(evt) {
        let {drawingMode, fabricCanvas} = get()
        if (drawingMode === evt.target.textContent) {
          drawingMode = fabricCanvas.isDrawingMode ? false : evt.target.textContent
        } else {
          drawingMode = evt.target.textContent
        }
        const [width, color] = evt.target.dataset.stroke.split(',')
        const brush = fabricCanvas.freeDrawingBrush
        brush.color = color
        brush.width = Number(width)
        set({drawingMode})
        fabricCanvas.isDrawingMode = !!drawingMode
        find('[data-stroke]').forEach(elt => {
          elt.classList.toggle('active', elt.textContent === drawingMode)
          console.log(drawingMode, elt.textContent, elt.textContent === drawingMode)
        })
      },
      zoom(evt) {
        const {fabricCanvas} = get()
        let scale = Number(evt.target.dataset.scale)
        if (!scale) {
          scale = Math.min(container.offsetWidth / fabricCanvas.getWidth(), container.offsetHeight / fabricCanvas.getHeight())
        }
        const x = (container.offsetWidth - (scale * fabricCanvas.getWidth())) * 0.5
        const y = (container.offsetHeight - (scale * fabricCanvas.getHeight())) * 0.5
        fabricCanvas.setZoom(Number(scale))
        fabricCanvas.viewportTransform[4] = x
        fabricCanvas.viewportTransform[5] = y
      },
      exitDraw() {
        const {fabricCanvas} = get()
        fabricCanvas.isDrawingMode = false
        set({drawingMode: false})
      },
      moveToFront() {
        const {fabricCanvas} = get()
        fabricCanvas.bringToFront(fabricCanvas.getActiveObject())
      },
      moveToBack() {
        const {fabricCanvas, baseImage} = get()
        fabricCanvas.sendToBack(fabricCanvas.getActiveObject())
        if(baseImage) {
          fabricCanvas.bringForward(fabricCanvas.getActiveObject())
        }
        fabricCanvas.discardActiveObject()
      },
      deleteSelection() {
        const {fabricCanvas} = get()
        fabricCanvas.remove(fabricCanvas.getActiveObject())
        return true
      },
      destroy() {
        b8r.offAny('keydown(Backspace)', `${component.dataset.componentId}.deleteSelection`)
      },
      export() {
        const {fabricCanvas} = get()
        const [,,,x,y] = [...fabricCanvas.viewportTransform]
        const scale = fabricCanvas.getZoom()

        fabricCanvas.setZoom(1)
        fabricCanvas.viewportTransform[4] = 0
        fabricCanvas.viewportTransform[5] = 0
        const dataUrl = fabricCanvas.toDataURL()
        fabricCanvas.setZoom(scale)
        fabricCanvas.viewportTransform[4] = x
        fabricCanvas.viewportTransform[5] = y
        const w = window.open()
        const img = w.document.createElement('img')
        img.src = dataUrl
        w.document.body.append(img)
      }
    }
  }
}
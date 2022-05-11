/**
# image-editor

This is an **image-editor** built around [fabricjs](http://fabricjs.com/). It implements undo/redo
by leveraging fabricjs's serialization (`toJSON`, `loadFromJSON`) methods.

<b8r-component path="../components/fabric.js"></b8r-component>
*/

import {viaTag} from '../lib/scripts.js'

export default {
  css: `
    ._component_ {
      display: flex;
      flex-direction: column;
      background: #444;
    }

    ._component_ * {
      color: #eee;
    }

    ._component_ > canvas {
      width: 100%;
      min-height: 400px;
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

    ._component_ .active {
      color: var(--accent-color);
    }
  `,
  html: `
    <div class="row">
      <button data-event="click:_component_.addRect">Rect</button>
      <button 
          data-bind="class(active)=_component_.drawingMode"
          data-event="click:_component_.toggleDraw"
      >Draw</button>
      <span class="spacer"></span>
      <button
          data-bind="enabled_if=_component_.hasSelection"
          data-event="click:_component_.deleteSelection"
      >Delete</button>
      <span class="elastic"></span>
      <button 
          data-bind="enabled_if=_component_.canUndo"
          data-event="click:_component_.undo"
      ><span class="icon-undo"></span></button>
      <button 
          data-bind="enabled_if=_component_.undoDepth"
          data-event="click:_component_.redo"
      ><span class="icon-redo"></span></button>
    </div>
    <canvas tabindex="1" data-event="keydown(Backspace):_component_.deleteSelection"></canvas>
  `,
  async initialValue({b8r, component, findOne, get, set}) {
    await viaTag('https://cdnjs.cloudflare.com/ajax/libs/fabric.js/521/fabric.min.js')
    b8r.onAny('keydown(Backspace)', `${component.dataset.componentId}.deleteSelection`)

    const canvas = findOne('canvas')
    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    const fabricCanvas = new fabric.Canvas(canvas, {
      backgroundColor: '#888',
      selectionColor: '#0ff4',
      selectionLineWidth: 2,
      width,
      height
    })

    fabricCanvas.on('selection:created', () => {
      set({hasSelection: true})
    })

    fabricCanvas.on('selection:cleared', () => {
      set({hasSelection: false})
    })

    const undoBuffer = [fabricCanvas.toObject()]
    const trackState = (...args) => {
      if (get().skipTracking) {
        return
      }
      console.log('tracking state changes', ...args)
      undoBuffer.splice(0, get().undoDepth)
      undoBuffer.unshift(fabricCanvas.toObject())
      set({undoBuffer, canUndo: true, undoDepth: 0})
    }

    fabricCanvas.on('object:modified', trackState)

    fabricCanvas.on('object:added', trackState)

    fabricCanvas.on('object:removed', trackState)

    return {
      fabricCanvas,
      defaultShape: {
        width: 100,
        height: 100,
        left: width * 0.5 - 50,
        top: height * 0.5 - 50,
        strokeUniform: true,
      },
      settings: {
        strokeWidth: 2,
        stroke: 'red',
        fill: 'yellow',
      },
      skipTracking: false,
      canUndo: false,
      undoBuffer,
      undoDepth: 0,
      addRect() {
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
      hasSelection: false,
      drawingMode: false,
      undo () {
        set({skipTracking: true})
        const undoDepth = get().undoDepth + 1
        fabricCanvas.loadFromJSON(undoBuffer[undoDepth])
        set({
          undoDepth,
          canUndo: undoDepth < undoBuffer.length - 1,
          skipTracking: false
        })
      },
      redo () {
        set({skipTracking: true})
        const undoDepth = get().undoDepth - 1
        fabricCanvas.loadFromJSON(undoBuffer[undoDepth])
        set({undoDepth})
        set({undoDepth, canUndo: true, skipTracking: false})
      },
      toggleDraw() {
        const drawingMode = !fabricCanvas.isDrawingMode
        const brush = fabricCanvas.freeDrawingBrush
        brush.color = '#228'
        brush.width = 2
        set({drawingMode})
        fabricCanvas.isDrawingMode = drawingMode
      },
      exitDraw() {
        fabricCanvas.isDrawingMode = false
        set({drawingMode: false})
      },
      deleteSelection() {
        fabricCanvas.remove(fabricCanvas.getActiveObject())
        return true
      },
      destroy() {
        b8r.offAny('keydown(Backspace)', `${component.dataset.componentId}.deleteSelection`)
      }
    }
  }
}
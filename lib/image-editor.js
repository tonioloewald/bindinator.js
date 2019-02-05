/**

# Image Editor

**ndie** is a simple non-destructive HTML5-based editor. It keeps the original image and tracks
user actions as a series of changes to that image.

**Usage**:

    imageEditor( *element *settings_object* ) --> returns *ndie instance*

By default, any contents of the target element(s) will be replaced with a blank (transparent)
editable canvas with minimal tools.

**Settings** values include:

* **img** — an image to be edited
* **src** — an image url to be edited
* **width**, **height** — size of ndie
* **tools** — an array of strings naming the tools to be provided
* **ready** — a callback executed when the ndie instance is ready (this will be
  immediate unless a non-data src url is provided) in its context

## Methods and Properties

* *ndie*.image() — returns the current image
* *ndie*.baseImage — the original image (false if there was none)
* *ndie*.changeList — returns the change list (a list of closures)
* *ndie*.redoList — returns the redo list (a list of closures)
* **TODO** *ndie*.selection() — returns the selected portion of the image

## Basic Tools

There are several categories of tools.

**History Tools**

* history: undo and redo
* revert

**Settings Tools**

* **TODO** fill: set fill color
* **TODO** fillOpacity
* **TODO** stroke: set stroke color
* **TODO** background: transparent or a specified color
* **TODO** fontSize
* **TODO** fontFamily
* **TODO** fontStyle: currently no support for font styles
* **TODO** lineWidth: set line width
* **TODO** lineStyle: set line style (plain, dashed, dotted; with or without arrows)

**Selection tools** allow the user to select part of an image

* **TODO** marquee
* **TODO** lasso

**Image editing tools** allow the user to make changes to the image as a whole:

* gamma
* crop
* rotate
* clear

* **TODO** fill
* **TODO** brightness
* **TODO** contrast
* **TODO** hue
* **TODO** resize canvas
* **TODO** scale
* **TODO** flip

**Drawing tools** allow the user to create new image elements:

* rect
* **TODO** oval
* text
* line
* **TODO** freehand
* **TODO** pencil
* **TODO** bezier

### MISC TODO

* fabrication of controls given a list in the same vein as the editor
  * controls show when they are active
  * undo/redo and revert enabled/disabled as appropriate
* image-processing harness (so you can simply pass an image, selection, and filter function)
* implement image caching to improve performance
 */
/* global confirm, console, HTMLCanvasElement, Image, FileReader */

import b8r from 'source/b8r.js'

const angle = (x, y) => {
  var a = 0
  if (Math.abs(x) < 10) {
    if (y < 0) {
      a = -Math.PI / 2
    } else {
      a = Math.PI / 2
    }
  } else {
    a = Math.atan(y / x)
    if (x < 0) {
      a += Math.PI
    }
  }
  return a
}

const tools = {
  /**
    ##NDIE Tools

    tools with an apply method are interactive but do not have an actual effect on
    the image until the apply button is pushed.

    tool methods are called in the <ndie-instance> context (i.e. this points
    to the instance) and are passed a settings object that contains all kinds
    of useful information (e.g. the current fill, background, lineWidth, and
    so forth, along with the current event and a reference to the tool itself)

    the setup method is called when a tool is first chosen

    the apply "panel" can be accessed via <ndie-instance>.panel; custom controls
    should be inserted in the span inside the panel (it is initially empty)

    the drag method is called as the user drags in the canvas

    the apply method is called when the user clicks apply (in fact it is
    wrapped in a closure which is placed in the changeList and executed).
  */
  rotate: {
    setup: function (settings) {
      settings = tools.rotate.updatedSettings({
        a: 0,
        active: true
      })
      settings.tool.draw.call(this, settings)
      settings.active = false
      this.panel.find('span').append('<label>Angle<input type="range" min="-180" max="180" step="0.5" value="0.0"></label>')
      var self = this
      this.panel.find('input').on('change', function () {
        self.refresh()
        self.updatedSettings({
          calculate_angle: false,
          a: parseFloat(self.panel.find('input').val()) * Math.PI / 180,
          active: true
        })
        self.currentTool.draw.call(self, self.settings)
        self.settings.active = false
      })
    },
    drag: function (settings) {
      settings.calculate_angle = true
      settings.tool.apply.call(this, settings)
    },
    draw: function (settings) {
      var w = this.canvas.width

      var h = this.canvas.height

      var cx = this.canvas.width / 2

      var cy = this.canvas.height / 2

      var tempImage
      if (settings.active) {
        tempImage = this.currentImage
      } else {
        tempImage = this.canvas.toImage()
      }
      this.cg.clearRect(0, 0, w, h)
      this.cg.save()
      this.cg.translate(cx, cy)
      this.cg.rotate(settings.a)
      this.cg.drawImage(tempImage, -tempImage.width / 2, -tempImage.height / 2)
      this.cg.restore()
      if (settings.active) {
        this.cg.fillStyle = this.gridPattern
        this.cg.fillRect(0, 0, w, h)
      }
    },
    apply: function (settings) {
      if (settings.calculate_angle) {
        var x = settings.x

        var y = settings.y

        var dx = settings.w

        var dy = settings.h

        var cx = this.canvas.width / 2

        var cy = this.canvas.height / 2
        settings.a = angle(x + dx - cx, y + dy - cy) - angle(x - cx, y - cy)
      }
      settings.tool.draw.call(this, settings)
    }
  },
  crop: {
    setup: function (settings) {
      var w = this.canvas.width

      var h = this.canvas.height
      settings.x = w * 0.1
      settings.y = h * 0.1
      settings.w = w * 0.8
      settings.h = h * 0.8
      settings.tool.drag.call(this, settings)
    },
    drag: function (settings) {
      var x = settings.x

      var y = settings.y

      var dx = settings.w

      var dy = settings.h

      var w = this.canvas.width

      var h = this.canvas.height

      var left = dx > 0 ? x : x + dx

      var right = dx > 0 ? x + dx : x

      var top = dy > 0 ? y : y + dy

      var bottom = dy > 0 ? y + dy : y

      var width = Math.abs(dx)
      this.refresh()
      this.cg.fillStyle = 'rgba(0,0,0,0.5)'
      this.cg.fillRect(0, 0, left, h)
      this.cg.fillRect(right, 0, w - right, h)
      this.cg.fillRect(left, 0, width, top)
      this.cg.fillRect(left, bottom, width, h - bottom)
    },
    apply: function (settings) {
      var tempImage = this.canvas.toImage()
      this.canvas.width = settings.w
      this.canvas.height = settings.h
      this.cg.drawImage(tempImage, -settings.x, -settings.y)
    }
  },
  text: {
    setup: function (settings) {
      var self = this

      var update = function () {
        self.settings.text = this.value
        self.refresh()
        self.currentTool.apply.call(self, self.updatedSettings())
      }
      this.panel.find('span').append('<label>Text<input value="Text"></label>')
      settings.x = this.canvas.width * 0.3
      settings.y = this.canvas.height * 0.5
      this.panel.find('input').on('keyup change', update)
        .trigger('change')
        .select()
    },
    drag: function (settings) {
      settings.x += settings.w
      settings.y += settings.h
      this.panel.find('input').trigger('change')
    },
    apply: function (settings) {
      this.cg.font = settings.fontSize + 'px ' + settings.fontFamily
      this.cg.fillStyle = settings.fill
      var rect = this.cg.measureText(settings.text)
      if (settings.fillOpacity > 0) {
        this.cg.globalAlpha = parseFloat(settings.fillOpacity)
        this.cg.fillRect(settings.x - 4, settings.y - settings.fontSize - 4, rect.width + 8, settings.fontSize * 1.33 + 8)
        this.cg.globalAlpha = 1
      }
      this.cg.fillStyle = settings.stroke
      this.cg.fillText(settings.text, settings.x, settings.y)
    }
  },
  /**
    ### Image Processing Tools

    gamma is a good template for any image-processing filter, or it could be expanded to handle
    multiple image processing requirements, such as brightness, contrast, saturation, and
    hue-shift

    hue and saturation would involve conversion to and from HSV (or HSL) color space.
    you can find the relevant code here:
    http://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
  */
  gamma: {
    setup: function (settings) {
      var self = this
      this.panel.find('span').append('<label>Gamma<input type="range" min="0.25" max="2.0" step="0.1" value="1.0"></label>')
      this.panel.find('input').on('change', function () {
        self.refresh()
        settings.gamma = 1 / parseFloat(self.panel.find('input').val())
        self.currentTool.apply.call(self, settings)
      })
    },
    apply: function (settings) {
      var imageData = this.cg.getImageData(0, 0, this.canvas.width, this.canvas.height)

      var gamma = settings.gamma

      var p; var g = []; var x; var y

      // create lookup table (optimization)
      // call Math.pow 256 times vs. w * h * 3!
      for (x = 0; x < 256; x++) {
        g[x] = Math.pow(x / 255, gamma) * 255
      }

      for (x = 0; x < this.canvas.width; x++) {
        for (y = 0; y < this.canvas.height; y++) {
          p = 4 * (y * this.canvas.width + x)
          imageData.data[p] = g[imageData.data[p]]
          imageData.data[p + 1] = g[imageData.data[p + 1]]
          imageData.data[p + 2] = g[imageData.data[p + 2]]
          // imageData.data[p + 3] is the alpha channel
        }
      }

      this.cg.putImageData(imageData, 0, 0)
    }
  },
  /**
    ### Modal Tools

    line and rect are modal tools which produce instant results, signified
    by having an end method but no apply

    if a modal tool has no drag method, its end method will be applied
    during drags instead
  */
  line: {
    end: function (settings) {
      this.cg.strokeStyle = settings.stroke
      this.cg.lineWidth = settings.lineWidth
      this.cg.beginPath()
      this.cg.moveTo(settings.x, settings.y)
      this.cg.lineTo(settings.x + settings.w, settings.y + settings.h)
      this.cg.stroke()
    }
  },
  rect: {
    end: function (settings) {
      this.cg.fillStyle = settings.fill
      this.cg.strokeStyle = settings.stroke
      if (settings.fillOpacity > 0) {
        this.cg.globalAlpha = parseFloat(settings.fillOpacity)
        this.cg.fillRect(settings.x, settings.y, settings.w, settings.h)
        this.cg.globalAlpha = 1
      }
      if (settings.lineWidth > 0) {
        this.cg.lineWidth = settings.lineWidth
        this.cg.strokeRect(settings.x, settings.y, settings.w, settings.h)
      }
    }
  },
  ellipse: {
    end: function (settings) {
      this.cg.fillStyle = settings.fill
      this.cg.strokeStyle = settings.stroke

      // for the next two computations we get the distance from the edge of the canvas to the two relevant points
      // then calculate the average to get the x and y coordinates of the center of the ellipse
      var centerX = (settings.w + 2 * settings.x) / 2
      var centerY = (settings.h + 2 * settings.y) / 2

      var width = settings.w
      var height = settings.h

      this.cg.beginPath()

      // refer to http://www.williammalone.com/briefs/how-to-draw-ellipse-html5-canvas/ for an explanation of these function calls
      this.cg.moveTo(centerX, centerY - height / 2)

      this.cg.bezierCurveTo(
        centerX + width / 2, centerY - height / 2,
        centerX + width / 2, centerY + height / 2,
        centerX, centerY + height / 2)

      this.cg.bezierCurveTo(
        centerX - width / 2, centerY + height / 2,
        centerX - width / 2, centerY - height / 2,
        centerX, centerY - height / 2)

      this.cg.fillStyle = settings.fill
      this.cg.strokeStyle = settings.stroke

      this.cg.fill()
    }
  },
  /*
    ### Immediate Tools

    invert and clear are immediate tools — represented by a bare function
    they will be passed the settings object
  */
  invert: function () {
    var imageData = this.cg.getImageData(0, 0, this.canvas.width, this.canvas.height)
    var x, y, p

    for (x = 0; x < this.canvas.width; x++) {
      for (y = 0; y < this.canvas.height; y++) {
        p = 4 * (y * this.canvas.width + x)
        imageData.data[p] = 255 - imageData.data[p]
        imageData.data[p + 1] = 255 - imageData.data[p + 1]
        imageData.data[p + 2] = 255 - imageData.data[p + 2]
        // imageData.data[p + 3] is the alpha channel
      }
    }

    this.cg.putImageData(imageData, 0, 0)
  },
  clear: function (settings) {
    this.cg.fillStyle = settings.background
    this.cg.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.cg.fillRect(0, 0, this.canvas.width, this.canvas.height)
  },

  /**
    ### History Tools

    revert, undo, and redo are special immediate tools that manipulate
    the changeList and redoList (and do not, themselves, get inserted
    into those lists).

    There is no way to add your own history tools right now, although
    providing a mechanism to do so would be easy enough.
   */
  revert: function () {
    if (this.changeList.length && confirm('Remove all changes?')) {
      this.changeList = []
      this.render().refresh()
    }
  },
  undo: function () {
    if (this.changeList.length) {
      this.redoBuffer.push(this.changeList.pop())
      this.render().refresh()
    }
  },
  redo: function () {
    if (this.redoBuffer.length) {
      this.changeList.push(this.redoBuffer.pop())
      this.render().refresh()
    }
  }
}

if (!HTMLCanvasElement.prototype.toImage) {
  HTMLCanvasElement.prototype.toImage = function () {
    var image = new Image()
    image.src = this.toDataURL()
    return image
  }
}

class ImageEditor {
  constructor (target, options) {
    this.root = target
    this.options = options = Object.assign({
      width: target.offsetWidth,
      height: target.offsetHeight,
      fill: 'rgba(0,0,0,0.5)',
      stroke: 'rgba(255,255,0,0.8)',
      background: 'rgba(255,255,255,0)',
      fontFamily: 'Sans-serif',
      fontSize: 36,
      lineWidth: 4,
      fillOpacity: 1
    }, options)
    this.width = options.width
    this.height = options.height
    this.crop = { left: 0, right: 0, top: 0, bottom: 0 }
    this.settings = {}
    this.changeList = []
    this.redoBuffer = []
    this.scale = 1
    this.makeScaler()
    this.canvas = b8r.create('canvas')
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.cg = this.canvas.getContext('2d')
    /*
    // disable image scaling when drawing
    this.cg.imageSmoothingEnabled = false;
    */
    this.fill = options.fill
    this.fillOpacity = options.fillOpacity
    this.stroke = options.stroke
    this.background = options.background
    this.fontFamily = options.fontFamily
    this.fontSize = options.fontSize
    this.lineWidth = options.lineWidth
    this.currentTool = false
    this.makePanel()

    document.addEventListener('paste', this.pasteHandler)

    this.setBGPattern()
    this.setGrid()

    this.scaler.appendChild(this.canvas)
    this.root.appendChild(this.scaler)
    this.root.appendChild(this.panel)
    if (options.image) {
      this.baseImage = options.image
    } else if (options.src) {
      this.baseImage = new Image()
      this.baseImage.src = options.src
      this.baseImage.onload = this.ready
    } else {
      this.baseImage = new Image(this.width, this.height)
      this.ready()
    }
    this.currentImage = this.baseImage

    b8r.set('image-editor-controller', {
      mousedown: this.start,
      mousemove: this.drag,
      mouseup: this.end,
      panelClick: this.panelClick
    })

    b8r.on(this.root, 'mousedown', 'image-editor-controller.mousedown')
    b8r.on(this.root, 'mousemove', 'image-editor-controller.mousemove')
    b8r.on(this.root, 'mouseup', 'image-editor-controller.mouseup')
    b8r.on(this.panel, 'mouseup', 'image-editor-controller.panelClick')
  }

  makeScaler () {
    this.scaler = b8r.create('div') // $('<div>').css({width: this.width, height: this.height});
    b8r.styles(this.scaler, { width: this.width, height: this.height })
  }

  makePanel () {
    this.panel = b8r.create('div')
    this.panel.classList.add('panel')
    this.panel.appendChild(this.createButton('apply'))
    this.panel.appendChild(this.createButton('cancel'))
    b8r.hide(this.panel)
  }

  createButton (text) {
    const button = b8r.create('button')
    button.textContent = text
    return button
  }

  panelClick (evt) {
    const command = evt.target.textContent
    if (this[command]) {
      this[command]()
    }
  }

  /*
    paste support from
    http://stackoverflow.com/questions/6333814/how-does-the-paste-image-from-clipboard-functionality-work-in-gmail-and-google-c
  */
  pasteHandler (evt) {
    if (!b8r.isInBody(this.root)) {
      document.removeEventListener('paste', this.pasteHandler)
      return
    }
    var items = (evt.clipboardData || evt.originalEvent.clipboardData).items
    // console.log(JSON.stringify(items));
    if (items[0].type === 'image/png') {
      var blob = items[0].getAsFile()

      var reader = new FileReader()
      reader.onload = function (evt) {
        // data = evt.target.result;
        var image = new Image()
        image.src = evt.target.result
        image.onload = function () {
          this.changeList.push(function () {
            this.canvas.width = image.width
            this.canvas.height = image.height
            this.cg.drawImage(image, 0, 0)
          })
          this.render().refresh()
        }
      }
      reader.readAsDataURL(blob)
    }
  }

  setBGPattern () {
    // create background tiling pattern
    var bg = document.createElement('canvas')

    var ctx = bg.getContext('2d')
    bg.width = 34
    bg.height = 34
    ctx.fillStyle = '#aaa'
    ctx.fillRect(0, 0, 34, 34)
    ctx.fillStyle = '#999'
    ctx.fillRect(0, 0, 17, 17)
    ctx.fillRect(17, 17, 17, 17)
    this.root.css('background', 'url(' + bg.toDataURL() + ')')
  }

  setGrid () {
    var bg = document.createElement('canvas')

    var ctx = bg.getContext('2d')
    bg.width = 64
    bg.height = 64
    ctx.fillStyle = 'rgba(0,0,0,0.1)'
    ctx.fillRect(0, 0, 64, 64)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = '1px'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(64, 0)
    ctx.lineTo(64, 64)
    ctx.stroke()
    this.gridPattern = this.cg.createPattern(bg, 'repeat')
  }

  command (name) {
    var tool = tools[name]

    var self = this

    if (this.currentTool) {
      this.currentTool = false
      this.panel.hide()
      this.refresh()
    }

    if (name.match(/^(undo|redo|revert)$/)) {
      tool.call(this)
    } else if (tool) {
      if (typeof tool === 'function') {
      // immediate tools
        var settings = this.newSettings()
        this.changeList.push(function () {
          tool.call(self, settings)
        })
        this.render().refresh()
      } else if (tool.apply || tool.end) {
        this.currentTool = tool
        this.newSettings()
        // interactive tools
        if (tool.apply) {
          this.panel.show().find('span').empty()
        }
        if (tool.setup) {
          tool.setup.call(this, this.settings)
        }
      }
    } else {
      console.error('ndie does not recognize command', name)
    }
    return this
  }

  clearCommand () {
    this.currentTool = false
  }

  newSettings (coords) {
    this.settings = {
      tool: this.currentTool,
      active: false
    }
    return this.updatedSettings(coords)
  }

  updatedSettings (coords) {
    return Object.assign(this.settings, coords, {
      fill: this.fill,
      fillOpacity: this.fillOpacity,
      stroke: this.stroke,
      background: this.background,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      lineWidth: this.lineWidth
    })
  }

  start (evt) {
    if (this.currentTool) {
      this.newSettings({
        x: evt.offsetX,
        y: evt.offsetY,
        evt: evt,
        active: true
      })
      if (this.currentTool.start) {
        this.currentTool.start.call(this, this.settings)
      }
    }
  }

  drag (evt) {
    if (this.settings.active) {
      this.updatedSettings({
        w: evt.offsetX - this.settings.x,
        h: evt.offsetY - this.settings.y,
        evt: evt
      })
      if (this.currentTool.drag) {
        this.currentTool.drag.call(this, this.settings)
      } else if (this.currentTool.end) {
        this.refresh()
        this.currentTool.end.call(this, this.settings)
      }
    }
  }

  end (evt) {
    if (this.currentTool && this.currentTool.end && this.settings.active) {
      var self = this

      var tool = self.currentTool

      var settings = self.settings
      this.updatedSettings({
        evt: evt,
        active: false
      })
      this.changeList.push(function () {
        tool.end.call(self, settings)
      })
      this.render().refresh()
      this.redoBuffer = []
    }
    this.settings.active = false
  }

  apply (evt) {
    if (this.currentTool) {
      var self = this

      var tool = self.currentTool

      var settings = this.updatedSettings({
        evt: evt,
        active: false
      })
      this.panel.hide()
      this.changeList.push(function () {
        tool.apply.call(self, settings)
      })
      this.render().refresh()
      this.currentTool = false
      this.redoBuffer = []
    }
  }

  cancel () {
    this.panel.hide()
    this.currentTool = false
    return this.refresh()
  }

  ready () {
    this.updateSize(this.baseImage.width, this.baseImage.height)
    if (this.options.ready) {
      this.options.ready.apply(this)
    }
    return this.render().refresh()
  }

  render () {
    this.updateSize(this.width, this.height)
    this.cg.drawImage(this.baseImage, 0, 0)
    for (var i = 0; i < this.changeList.length; i++) {
      this.changeList[i]()
    }
    this.currentImage = this.canvas.toImage()
    return this
  }

  refresh () {
    this.updateSize(this.width, this.height)
    this.cg.drawImage(this.currentImage, 0, 0)
    return this
  }

  image () {
    return this.canvas.toImage()
  }

  updateSize (w, h) {
    if (w) {
      this.width = w
      if (h) {
        this.height = h
      }
      this.canvas.width = this.width
      this.canvas.height = this.height
    }
    this.canvas.style.transformOrigin = '0 0'
    this.canvas.style.transform = `scale(${this.scale})`
    this.scaler.css({
      width: this.width * this.scale,
      height: this.height * this.scale
    })
    return this
  }

  setScale (factor) {
    if (factor) {
      this.scale = factor
    }
    this.updateSize()
    return this
  }
}

const imageEditor = (element, settings) => new ImageEditor(element, settings)

module.exports = { imageEditor, tools, ImageEditor }

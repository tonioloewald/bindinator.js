/**
# editable-rect

Creates an editable-rect that is absolutely positioned

```
<b8r-moveable x="20" y="10"></b8r-moveable>
<b8r-lock-toggle style="position: absolute; right: 10px; top: 10px" onChange="(evt) => console.log(evt)"></b8r-lock-toggle>
<b8r-editable-rect></b8r-editable-rect>
<script>
  import('../web-components/editable-rect.js')
</script>
```
*/

import { makeWebComponent, slot, div, makeElement, dispatch } from '../lib/web-components.js'

const makeSVG = (d, width=12, height=12, viewWidth=16, viewHeight=16) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('version', '1.1')
  svg.setAttribute('width', width)
  svg.setAttribute('height', height)
  svg.setAttribute('viewBox', `0 0 ${viewWidth} ${viewHeight}`)
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  path.setAttribute('fill', 'rgba(0,128,255,0.5)')
  svg.appendChild(path)
  return svg
}

const locked = makeSVG('M10,8 L10,6 C10,4.8954305 9.1045695,4 8,4 C6.8954305,4 6,4.8954305 6,6 L6,8 L10,8 Z M4,8 L4,6 C4,3.790861 5.790861,2 8,2 C10.209139,2 12,3.790861 12,6 L12,8 C12.5522847,8 13,8.44771525 13,9 L13,14 C13,14.5522847 12.5522847,15 12,15 L4,15 C3.44771525,15 3,14.5522847 3,14 L3,9 C3,8.44771525 3.44771525,8 4,8 Z')
const unlocked = makeSVG('M9,8 C9.55228475,8 10,8.44771525 10,9 L10,14 C10,14.5522847 9.55228475,15 9,15 L1,15 C0.44771525,15 0,14.5522847 0,14 L0,9 C0,8.44771525 0.44771525,8 1,8 L7,8 L7,4 C7,1.790861 8.790861,0 11,0 C13.209139,0 15,1.790861 15,4 L15,7 L13,7 L13,4 C13,2.8954305 12.1045695,2 11,2 C9.8954305,2 9,2.8954305 9,4 L9,8 Z')
const rotate = makeSVG('M18.4557445,6.45191095 C16.3710907,5.83161489 14.1623316,5.49846827 11.8755749,5.49846827 C9.34637731,5.49846827 6.91259253,5.90599962 4.63660295,6.65882946 L3.89626955,5 L0,9.72614343 L6.12776295,10 L5.45411631,8.49059236 C7.47800644,7.84237262 9.63581534,7.49234136 11.8755749,7.49234136 C13.8728781,7.49234136 15.8050129,7.77069189 17.635127,8.29062915 L16.872237,10 L23,9.72614343 L19.1037305,5 L18.4557447,6.45191052 L18.4557445,6.45191095 Z', 12, 12, 24, 16)
const elastic = makeSVG('M12.0713879,4.62882754 C12.4066351,3.79074547 13.5930324,3.79074547 13.9282796,4.62882754 L15.9282131,9.62844756 C16.1333197,10.1411921 15.883912,10.7231183 15.3711456,10.9282161 C14.8583791,11.133314 14.276428,10.883917 14.0713214,10.3711725 L12.9998338,7.69256777 L11.9283461,10.3711725 C11.5930989,11.2092545 10.4067016,11.2092545 10.0714544,10.3711725 L8.99996675,7.69256777 L7.92847907,10.3711725 C7.59323191,11.2092545 6.40683459,11.2092545 6.07158743,10.3711725 L5.00009975,7.69256777 L3.92861207,10.3711725 C3.59336491,11.2092545 2.40696759,11.2092545 2.07172043,10.3711725 L0.0717869282,5.37155244 C-0.133319659,4.85880789 0.116087953,4.27688168 0.62885442,4.07178386 C1.14162089,3.86668604 1.72357198,4.11608299 1.92867857,4.62882754 L3.00016625,7.30743223 L4.07165393,4.62882754 C4.40690109,3.79074547 5.59329841,3.79074547 5.92854557,4.62882754 L7.00003325,7.30743223 L8.07152093,4.62882754 C8.40676809,3.79074547 9.59316541,3.79074547 9.92841257,4.62882754 L10.9999003,7.30743223 L12.0713879,4.62882754 Z')

const clamp = (min, x, max) => {
  if (x < min) { 
    return min
  } else if (x > max) {
    return max
  } else {
    return x
  }
}

let _moveState = null
const _moveEventDiv = div()
Object.assign(_moveEventDiv.style, {
  content: ' ',
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0
})

const _move = (evt) => {
  const {
    callback,
    pageX,
    pageY,
    lastPageX,
    lastPageY,
    origX,
    origY,
  } = _moveState
  const dx = evt.pageX - lastPageX
  const dy = evt.pageY - lastPageY
  _moveState.lastPageX += dx
  _moveState.lastPageY += dy
  callback(evt.pageX - pageX + origX, evt.pageY - pageY + origY, dx, dy)
}

_moveEventDiv.addEventListener('mousemove', _move)

_moveEventDiv.addEventListener('mouseup', (evt) => {
  _move(evt)
  _moveState = null
  _moveEventDiv.remove()
})

const trackDrag = (initialEvent, origX, origY, callback) => {
  const {
    pageX,
    pageY
  } = initialEvent
  _moveState = {
    callback,
    pageX,
    pageY,
    lastPageX: pageX,
    lastPageY: pageY,
    origX,
    origY
  }
  document.body.append(_moveEventDiv)
}
      
const Handle = makeWebComponent('b8r-moveable', {
  attributes: {
    x: 0,
    y: 0,
    leftBound: 0,
    topBound: 0,
    rightBound: 0,
    bottomBound: 0
  },
  content: null,
  style: {
    ':host': {
      background: 'rgba(0,128,255,0.5)',
      width: '8px',
      height: '8px',
      transform: 'translateX(-50%) translateY(-50%)',
      position: 'absolute',
      cursor: 'move'
    },
  },
  eventHandlers: {
    mousedown(evt) {
      const minX = this.leftBound
      const maxX = this.parentElement.clientWidth - this.rightBound
      const minY = this.topBound
      const maxY = this.parentElement.clientHeight - this.bottomBound
      trackDrag(evt, this.x, this.y, (x, y) => {
        this.x = clamp(minX, x, maxX)
        this.y = clamp(minY, y, maxY)
        dispatch(this, 'moved')
      })
    },
  },
  methods: {
    render() {
      this.style.left = this.x + 'px' 
      this.style.top = this.y + 'px'
    }
  }
})

const handle = (props={}) => makeElement('b8r-moveable', props)

const LockToggle = makeWebComponent('b8r-lock-toggle', {
  attributes: {
    locked: false
  },
  style: {

  },
  content: [
    locked.cloneNode(true),
    unlocked.cloneNode(true)
  ],
  eventHandlers: {
    mouseup() {
      this.locked = ! this.locked
      dispatch(this, 'change')
    }
  },
  methods: {
    render() {
      const [locked, unlocked] = this.shadowRoot.querySelectorAll('svg')
      if (this.locked) {
        locked.style.display = ''
        unlocked.style.display = 'none'
      } else {
        locked.style.display = 'none'
        unlocked.style.display = ''
      }
    }
  }
})

const lockToggle = (props={}) => makeElement('b8r-lock-toggle', props)

const pixelDimension = (number) => isNaN(number) ? '' : number + 'px'

export const EditableRect = makeWebComponent('b8r-editable-rect', {
  attributes: {
    top: 40,
    left: 60,
    bottom: NaN,
    right: NaN,
    width: 80,
    height: 40,
    minWidth: 10,
    minHeight: 10
  },
  style: {
    ':host': {
      position: 'absolute',
      width: '100%',
      height: '100%'
    },
    ':host .positioned': {
      display: 'block',
      position: 'absolute',
      background: 'rgba(0,128,255,0.1)'
    },
    '.handle': {
      display: 'block',
      width: '8px',
      height: '8px',
      background: 'rgba(0,128,255,0.25)',
      position: 'absolute',
      cursor: 'move',
    },
    '.handle:hover': {
      background: 'rgba(0,128,255,0.5)',
    },
    '.top': {
      top: '-4px'
    },
    '.bottom': {
      bottom: '-4px'
    },
    '.left': {
      left: '-4px'
    },
    '.right': {
      right: '-4px'
    },
    'b8r-lock-toggle': {
      position: 'absolute'
    },
    'b8r-lock-toggle.left': {
      top: '50%',
      left: '0',
      transform: 'translateX(-100%) translateY(-50%)'
    },
    'b8r-lock-toggle.right': {
      top: '50%',
      right: '0',
      transform: 'translateX(100%) translateY(-50%)'
    },
    'b8r-lock-toggle.top': {
      top: '0',
      left: '50%',
      transform: 'translateX(-50%) translateY(-100%)'
    },
    'b8r-lock-toggle.bottom': {
      bottom: '0',
      left: '50%',
      transform: 'translateX(-50%) translateY(100%)'
    },
    '.center': {
      width: '11px',
      height: '11px',
      top: '50%',
      left: '50%',
      transform: 'translateX(-50%) translateY(-50%) rotateZ(45deg)'
    }
  },
  content: [
    div({
      classes: ['positioned'],
      content: [
        slot(),
        div({classes: ['handle', 'top', 'left']}),
        div({classes: ['handle', 'top', 'right']}),
        div({classes: ['handle', 'bottom', 'left']}),
        div({classes: ['handle', 'bottom', 'right']}),
        div({classes: ['handle', 'center']}),
        lockToggle({classes: ['left']}),
        lockToggle({classes: ['top']}),
        lockToggle({classes: ['right']}),
        lockToggle({classes: ['bottom']})
      ]
    })
  ],
  methods: {
    onMount() {
      const editable = this

      const topLeft = this.shadowRoot.querySelector('.top.left')
      topLeft.addEventListener('mousedown', (evt) => {
        trackDrag(evt, 0, 0, (x, y, dx, dy) => {
          if (! isNaN(editable.left)) editable.left += dx
          if (! isNaN(editable.width)) editable.width -= dx
          if (! isNaN(editable.top)) editable.top += dy
          if (! isNaN(editable.height)) editable.height -= dy
        })
      })

      const topRight = this.shadowRoot.querySelector('.top.right')
      topRight.addEventListener('mousedown', (evt) => {
        trackDrag(evt, 0, 0, (x, y, dx, dy) => {
          if (! isNaN(editable.right)) editable.right -= dx
          if (! isNaN(editable.width)) editable.width += dx
          if (! isNaN(editable.top)) editable.top += dy
          if (! isNaN(editable.height)) editable.height -= dy
        })
      })

      const bottomLeft = this.shadowRoot.querySelector('.bottom.left')
      bottomLeft.addEventListener('mousedown', (evt) => {
        trackDrag(evt, 0, 0, (x, y, dx, dy) => {
          if (! isNaN(editable.left)) editable.left += dx
          if (! isNaN(editable.width)) editable.width -= dx
          if (! isNaN(editable.bottom)) editable.bottom -= dy
          if (! isNaN(editable.height)) editable.height += dy
        })
      })

      const bottomRight = this.shadowRoot.querySelector('.bottom.right')
      bottomRight.addEventListener('mousedown', (evt) => {
        trackDrag(evt, 0, 0, (x, y, dx, dy) => {
          if (! isNaN(editable.right)) editable.right -= dx
          if (! isNaN(editable.width)) editable.width += dx
          if (! isNaN(editable.bottom)) editable.bottom -= dy
          if (! isNaN(editable.height)) editable.height += dy
        })
      })

      const center = this.shadowRoot.querySelector('.center')
      center.addEventListener('mousedown', (evt) => {
        trackDrag(evt, 0, 0, (x, y, dx, dy) => {
          if (! isNaN(editable.right)) editable.right -= dx
          if (! isNaN(editable.left)) editable.left += dx
          if (! isNaN(editable.bottom)) editable.bottom -= dy
          if (! isNaN(editable.top)) editable.top += dy
        })
      })

      const lockLeft = this.shadowRoot.querySelector('b8r-lock-toggle.left')
      lockLeft.addEventListener('change', function(evt) {
        if (this.locked) {
          editable.left = editable.parentElement.offsetWidth - editable.right - editable.width
          editable.width = NaN
        } else if (! isNaN(editable.width)) {
          editable.right = editable.parentElement.offsetWidth - editable.left - editable.width
          editable.left = NaN
        } else {
          editable.width = editable.parentElement.offsetWidth - editable.left - editable.right
          editable.left = NaN
        }
      })

      const lockRight = this.shadowRoot.querySelector('b8r-lock-toggle.right')
      lockRight.addEventListener('change', function(evt) {
        if (this.locked) {
          editable.right = editable.parentElement.offsetWidth - editable.left - editable.width
          editable.width = NaN
        } else if (! isNaN(editable.width)) {
          editable.left = editable.parentElement.offsetWidth - editable.right - editable.width
          editable.right = NaN
        } else {
          editable.width = editable.parentElement.offsetWidth - editable.left - editable.right
          editable.right = NaN
        }
      })

      const lockTop = this.shadowRoot.querySelector('b8r-lock-toggle.top')
      lockTop.addEventListener('change', function(evt) {
        if (this.locked) {
          editable.top = editable.parentElement.offsetHeight - editable.bottom - editable.height
          editable.height = NaN
        } else if (! isNaN(editable.height)) {
          editable.bottom = editable.parentElement.offsetHeight - editable.top - editable.height
          editable.top = NaN
        } else {
          editable.height = editable.parentElement.offsetHeight - editable.top - editable.bottom
          editable.top = NaN
        }
      })

      const lockBottom = this.shadowRoot.querySelector('b8r-lock-toggle.bottom')
      lockBottom.addEventListener('change', function(evt) {
        if (this.locked) {
          editable.bottom = editable.parentElement.offsetHeight - editable.top - editable.height
          editable.height = NaN
        } else if (! isNaN(editable.height)) {
          editable.top = editable.parentElement.offsetHeight - editable.bottom - editable.height
          editable.bottom = NaN
        } else {
          editable.height = editable.parentElement.offsetHeight - editable.top - editable.bottom
          editable.bottom = NaN
        }
      })
    },

    render() {
      const {
        left,
        top,
        right,
        bottom,
        width,
        height,
        topLeft,
        topRight,
        bottomLeft,
        bottomRight
      } = this

      const positioned = this.shadowRoot.querySelector('.positioned')

      positioned.style.left = pixelDimension(left)
      positioned.style.top = pixelDimension(top)
      positioned.style.width = pixelDimension(width)
      positioned.style.height = pixelDimension(height)
      positioned.style.right = pixelDimension(right)
      positioned.style.bottom = pixelDimension(bottom)

      this.shadowRoot.querySelector('b8r-lock-toggle.left').locked = ! isNaN(this.left)
      this.shadowRoot.querySelector('b8r-lock-toggle.right').locked = ! isNaN(this.right)
      this.shadowRoot.querySelector('b8r-lock-toggle.top').locked = ! isNaN(this.top)
      this.shadowRoot.querySelector('b8r-lock-toggle.bottom').locked = ! isNaN(this.bottom)
    },
  }
})
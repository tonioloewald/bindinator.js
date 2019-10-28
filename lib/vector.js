/**
# Vector Math

A library for manipulating arrays of numbers as vectors.

The main motivation for this library is to support rotation of 2d coordinates and to perform
collision detection for 2d polygons.

    add(v, w)         // adds vectors v and w
    mult(S, v)        // multiplies vector v by scalar s
    subtract(v, w)    // returns vector v - vector w
    size(v)           // returns size of vector v
    normliazed(v)     // returns normalized vector if v is not size 0
    dotProduct(v, w)  // calculates the dotProduct
    quadrant(v)       // returns quadrant containing 2d vector as Quadrant

**Note**: `isInPoly` uses bounding box rejection and then determines if the point lies
inside the polygon by counting hits on a ray going to the right (i.e. the x-direction).
If the number of hits is odd, then the point is considered "inside" the polygon. This works
for concave polygons and self-intersecting polygons.

### Quadrant

Quadrant is an enumeration, `Quadrant.NE` === 'NE', etc.

Note that the northern and eastern "halves" are considered to contain the x and y axes, respectively.
So the origin `[0,0]` is in `Quadrant.NE`.

~~~~
const {
  add,
  mult,
  subtract,
  dotProduct,
  size,
  normalized,
  quadrant,
  Quadrant,
  xIntercept,
  isInPoly,
  rotate2d,
} = await import('../lib/vector.js')

Test(() => add([1,2],[-1,-2])).shouldBeJSON([0,0])
Test(() => mult(-0.5,[-1,-2])).shouldBeJSON([0.5,1])
Test(() => subtract([1,2],[2,1])).shouldBeJSON([-1,1])
Test(() => dotProduct([1,2],[3,4])).shouldBe(11)
Test(() => dotProduct([-1,2,3],[0.5,2,4])).shouldBe(15.5)
Test(() => size([3,4])).shouldBe(5)
Test(() => size([1,2,3,4])).shouldBe(Math.sqrt(30))
Test(() => normalized([0,4])).shouldBeJSON([0,1])
Test(() => normalized([4,0])).shouldBeJSON([1,0])
Test(() => normalized([0,0,0])).shouldBeJSON([0,0,0])
Test(() => normalized([3,4])[0]).shouldBe(0.6, 0.01)
Test(() => normalized([3,4])[1]).shouldBe(0.8)
const ne = [1, 1], nw = [-0.5, 1], se = [0.5, -2], sw = [-2, -0.5]
Test(() => quadrant(ne)).shouldBe(Quadrant.NE)
Test(() => quadrant(sw)).shouldBe(Quadrant.SW)
Test(() => quadrant(nw)).shouldBe(Quadrant.NW)
Test(() => quadrant(se)).shouldBe(Quadrant.SE)
Test(() => xIntercept(ne, nw)).shouldBe(false)
Test(() => xIntercept(nw, ne)).shouldBe(false)
Test(() => xIntercept(sw, se)).shouldBe(false)
Test(() => xIntercept(sw, nw)).shouldBe(false)
Test(() => xIntercept(ne, se)).shouldBe(true)
Test(() => xIntercept([-0.5,1],[0.6,-1])).shouldBe(true)
Test(() => xIntercept([-0.5,1],[0.4,-1])).shouldBe(false)
const triangle = [[-1, 0], [1, 1], [1, -1]]
Test(() => isInPoly([-0.5,0], triangle)).shouldBe(true)
Test(() => isInPoly([-5,0], triangle)).shouldBe(false)
Test(() => isInPoly([0,5], triangle)).shouldBe(false)
Test(() => isInPoly([-0.5,0], triangle, false)).shouldBe(true)
Test(() => isInPoly([-5,0], triangle, false)).shouldBe(false)
Test(() => isInPoly([0,5], triangle, false)).shouldBe(false)
const concave = [[-1,-1],[0,0],[1,-1],[0,1]]
Test(() => isInPoly([0,0.5], concave)).shouldBe(true)
Test(() => isInPoly([0,-0.5], concave)).shouldBe(false)
Test(() => isInPoly([-0.51,-0.5], concave)).shouldBe(true)
Test(() => isInPoly([0.51,-0.5], concave)).shouldBe(true)
Test(() => isInPoly([-0.7,0.1], concave)).shouldBe(false)
Test(() => isInPoly([0.7,-0.05], concave)).shouldBe(false)
Test(() => isInPoly([0,0.5], concave, false)).shouldBe(true)
Test(() => isInPoly([0,-0.5], concave, false)).shouldBe(false)
Test(() => isInPoly([-0.51,-0.5], concave, false)).shouldBe(true)
Test(() => isInPoly([0.51,-0.5], concave, false)).shouldBe(true)
Test(() => isInPoly([-0.7,0.1], concave, false)).shouldBe(false)
Test(() => isInPoly([0.7,-0.05], concave, false)).shouldBe(false)
Test(() => rotate2d([1,0], 90)[0]).shouldBe(0,0.01)
Test(() => rotate2d([1,0], 90)[1]).shouldBe(1,0.01)
Test(() => rotate2d([1,1], 45)[1]).shouldBe(Math.sqrt(2),0.01)
Test(() => rotate2d([-1,1], -45)[1]).shouldBe(Math.sqrt(2),0.01)
~~~~
## isInPoly

    isInPoly(p, poly) // returns true if p `[x,y]` is inside a polygon `[[x0,y0],[x1,y1],...]`

The heart of almost any game engine is figuring out if something intersects
with something else. As soon as you're not dealing with rectangles whose sides run
parallel to axes, you essentially need something like this.

`isInPoly` uses the "winding count" method of figuring out whether a point is within a **closed
polygon**. The basic idea is if you draw a ray in any direction from a point p, the number of
times it crosses an edge of a polygon P tells you whether the point is inside or outside P.
If it crosses an **odd** number of edges it is **inside**, otherwise it's **outside**.

###  Torture Test

This code sample lets you play with the `isInPoly()` function and see
the extent to which the size of the polygon impacts the cost of the
test (in essence, it measures the performance benefit of bounding-box rejection).

It also graphically demonstrates just how precise the testing is (you don't ever
see stray red points).

In a nutshell, in my testing, bounding box rejection is about 75% faster
than xIntercept counting for triangles, with significantly greater savings
for more complex polygons.

```
<style>
  ._component_ > label {
    display: flex;
    align-items: center;
  }

  ._component_ > label > span:nth-child(1) {
    flex: 0 0 90px;
  }
</style>
<canvas
  width=512
  height=512
  style="width: 256px; height: 256px;"
  data-bind="method(_component_.render)=_component_.rotation,_component_.scale,_component_.count,_component_.sides"
></canvas>
<label>
  <span>Rotation</span>
  <input data-bind="value=_component_.rotation" type="range" min=-180 max=180 step=1>
  <span data-bind="text=${_component_.rotation}°"></span>
</label>
<label>
  <span>Scale</span>
  <input data-bind="value=_component_.scale" type="range" min=0.1 max=2.5 step=0.1>
</label>
<label>
  <span>Test Samples</span>
  <input data-bind="value=_component_.count" type="range" min=1000 max=100000 step=1000>
  <span data-bind="text=_component_.count"></span>
</label>
<label>
  <span>Sides</span>
  <input data-bind="value=_component_.sides" type="range" min=3 max=32 step=1>
  <span data-bind="text=_component_.sides"></span>
</label>
<label>
  <span>Render Time</span>
  <input data-bind="value=${_component_.time} ms" disabled>
</label>
<script>
  const canvas = findOne('canvas')
  const g = canvas.getContext('2d')
  const {
    add,
    mult,
    isInPoly,
    rotate2d,
  } = await import('../lib/vector.js')
  const concave = [
    [121,1],[137,26],[122,64],[182,65],[182,126],[150,126],[150,87],[133,87],[133,154],[179,154],[179,201],
    [156,201],[156,179],[102,179],[101,145],[59,145],[59,184],[1,184],[1,161],[26,160],[27,123],[68,122],
    [68,100],[10,101],[10,39],[42,39],[42,77],[68,77],[68,65],[82,64],[68,47],[84,1]
  ].map(v => add(v, [-100,-100]))
  set('rotation', -24)
  set('scale', 1)
  set('count', 10000)
  set('sides', 32)
  set('busy', false)
  set('render', async (element, [rotation, scale, count, sides]) => {
    g.fillStyle = '#111'
    g.fillRect(0,0,512,512)
    const start = Date.now()
    const poly = rotate2d(concave.slice(0, sides), rotation).map(p => mult(scale,p)).map(p => add([256,256], p))
    for(let i = 0; i < count; i++) {
      const x = Math.random() * 512
      const y = Math.random() * 512
      g.fillStyle = isInPoly([x,y], poly) ? 'yellow' : '#444'
      g.fillRect(x-1, y-1, 3, 3)
    }
    set('time', Date.now() - start)
  })
</script>
```
*/

export const add = (a, b) => a.map((x, i) => x + b[i])

export const mult = (s, a) => a.map(x => s * x)

export const subtract = (a, b) => add(a, mult(-1, b))

export const dotProduct = (a, b) => a.map((x, i) => x * b[i]).reduce((sum = 0, x) => sum + x)

export const size = a => Math.sqrt(a.reduce((m, x) => m + x * x, 0))

export const normalized = a => {
  const _size = size(a)
  return _size > 0 ? mult(1 / _size, a) : a
}

export const Quadrant = Object.freeze(['NE', 'NW', 'SE', 'SW'].reduce((obj, x) => {
  obj[x] = x
  return obj
}, {}))

export const quadrant = v => {
  const [x, y] = v
  if (y >= 0) {
    return x >= 0 ? Quadrant.NE : Quadrant.NW
  } else {
    return x >= 0 ? Quadrant.SE : Quadrant.SW
  }
}

/**
    xIntercept(a, b)

This function is used by `isInPoly`, and is only exposed for testing purposes.
It returns true if the line-segment a,b crosses the x-axis with x non-negative.
(This allows you to count the number of times a ray fired from a point hits the
edges of a polygon, which is how isInPoly works.)
*/
export const xIntercept = (a, b) => {
  // both left of origin
  if (a[0] < 0 && b[0] < 0) return false
  // both below x-axis
  if (a[1] < 0 && b[1] < 0) return false
  // both above x-axis
  if (a[1] >= 0 && b[1] >= 0) return false
  // both right of origin (and not both on one side of x-axis)
  if (a[0] > 0 && b[0] > 0) return true

  const v = subtract(b, a)
  const gradient = v[1] / v[0]
  const x = a[0] - a[1] / gradient
  return x >= 0
}

// the useBoundingBox parameter is for testing purposes
export const isInPoly = (p, poly, useBoundingBox = true) => {
  // fast rejection based on bounding box
  if (useBoundingBox) {
    const [x, y] = p
    let left, right, top, bottom
    left = right = poly[0][0]
    top = bottom = poly[0][1]
    for (let i = 1; i < poly.length; i++) {
      const p = poly[i]
      left = Math.min(left, p[0])
      right = Math.max(right, p[0])
      top = Math.max(top, p[1])
      bottom = Math.min(bottom, p[1])
    }
    if (x < left || x > right || y < bottom || y > top) return false
  }
  // slower rejection based on counting xIntercept
  const _poly = poly.map(v => subtract(v, p))
  const hits = _poly.map((p, i) => xIntercept(p, _poly[i === 0 ? _poly.length - 1 : i - 1]))
    .reduce((count, x) => x ? count + 1 : count)
  return !!(hits % 2)
}

const DEG2RAD = Math.PI / 180
export const rotate2d = (p, a) => {
  const [x, y] = p
  const radians = a * DEG2RAD
  const cosA = Math.cos(radians)
  const sinA = Math.sin(radians)

  if (Array.isArray(p[0])) {
    return p.map(([x, y]) => [x * cosA - y * sinA, y * cosA + x * sinA])
  }
  return [x * cosA - y * sinA, y * cosA + x * sinA]
}

/**
# imgSrc
Copyright ©2016-2017 Tonio Loewald

    imgSrc(img, url, cors=true)

Gracefully populates an `<img>` element's src attribute to a url,
sets the element to `opacity: 0`, and then fades it in when the image
is loaded.

    imagePomise(url, cors=true)

Returns a promise of an image (used by imgSrc), and it's memoized.
*/
/* global Image, HTMLImageElement, getComputedStyle, HTMLCanvasElement */
import { render } from '../lib/pixel.js'

const images = {}
const pixel = new Image()
pixel.src = render()
const pixelPromise = new Promise(resolve => resolve(pixel))

export const imagePromise = (url, cors = true) => {
  if (!url) {
    return pixelPromise
  } else if (images[url]) {
    return images[url]
  } else {
    images[url] = new Promise(resolve => {
      const image = new Image()

      // Cross-origin is necessary if you want to use the image data from JavaScript, in WebGL
      // for example, but you can't indiscriminately use it on all images. If you use
      // `crossorigin` on images from a source that doesn't reply with the
      // `Access-Control-Allow-Origin` header, the browser won't render them.
      if (cors) { image.setAttribute('crossorigin', 'anonymous') }

      image.src = url
      image.onload = () => {
        resolve(image)
      }
      image.onerror = () => {
        resolve(pixel)
      }
    })
    return images[url]
  }
}

export const imgSrc = (img, url, cors = true) => {
  if (img instanceof HTMLImageElement && img.src === url) {
    return
  }
  img.src = pixel.src
  img.style.opacity = 0.1
  imagePromise(url, cors).then(image => {
    if (!getComputedStyle(img).transition) {
      img.style.transition = '0.25s ease-out'
    }
    img.style.opacity = ''
    img.classList.add('-b8r-rendered')
    if (img instanceof HTMLCanvasElement) {
      img.width = img.offsetWidth
      img.height = img.offsetHeight
      const ctx = img.getContext('2d')
      const w = img.offsetWidth
      const h = img.offsetHeight
      const scale = Math.max(w / image.width, h / image.height)
      const sw = w / scale
      const sh = h / scale
      const sx = (image.width - sw) * 0.5
      const sy = (image.height - sh) * 0.5
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, w, h)
    } else {
      img.setAttribute('src', image.src)
    }
  })
}

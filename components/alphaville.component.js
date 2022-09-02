/**

<b8r-component path="../components/alphaville.component.js"></b8r-component>
*/

export default {
  css: `
    ._component_ {
      display: flex;
    }

    ._component_ img {
      min-height: 400px;
      object-fit: contain;
    }
  `,
  view ({ div, h4, img, input }) {
    const imageBlock = (title, imageProp) => div(
      { title },
      h4(title),
      img({ bindImg: `_component_.${imageProp}` }),
      input({ type: 'file', accept: 'image/*', onChange: '_component_.handleFile' })
    )
    return [
      imageBlock('image', 'image'),
      imageBlock('rgb', 'imageRGB'),
      imageBlock('alpha', 'imageAlpha')
    ]
  },
  initialValue ({ set, findOne }) {
    const fileActions = {
      image (img) {
        const canvas = document.createElement('canvas')
        const rgb = findOne('div[title="rgb"] > img')
        const alpha = findOne('div[title="alpha"] > img')
        const w = canvas.width = img.naturalWidth
        const h = canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const { data } = ctx.getImageData(0, 0, w, h)
        ctx.clearRect(0, 0, 512, 512)
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const offset = (y * h + x) * 4
            const a = data[offset + 3]
            ctx.fillStyle = `rgb(${a},${a},${a})`
            ctx.fillRect(x, y, 1, 1)
          }
        }
        alpha.src = canvas.toDataURL('image/png')
        ctx.clearRect(0, 0, 512, 512)
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const offset = (y * h + x) * 4
            const r = data[offset]
            const g = data[offset + 1]
            const b = data[offset + 2]
            ctx.fillStyle = `rgb(${r},${g},${b})`
            ctx.fillRect(x, y, 1, 1)
          }
        }
        rgb.src = canvas.toDataURL('image/png')
      },
      imageRGB () {
        // todo: rebuild image with new rgb
      },
      imageAlpha () {
        // todo: rebuild image with new alpha
      }
    }

    return {
      image: null,
      imageRGB: null,
      imageAlpha: null,
      handleFile (evt) {
        const { files } = evt.target
        const { title } = evt.target.closest('div[title]')
        const img = findOne('div[title="' + title + '"] > img')
        if (window.FileReader && files && files.length) {
          const fr = new window.FileReader()
          fr.onload = () => {
            // set(title, fr.result)
            img.src = fr.result
            img.onload = () => fileActions[title](img)
          }
          fr.readAsDataURL(files[0])
        }
      }
    }
  }
}

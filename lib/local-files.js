/**
# Local Files

A library for loading and saving local files in a web application.

    import {open, makeDraggableFile, download, setType} from './path/to/local-files.js'

    const rawData = await open({ type: 'json' }) // needs to be parsed

    saveData = JSON.stringify({ foo: 'bar' })

    // you can pass either a value or a function that calculates the value on drag
    makeDraggableFile(element, () => 'data to be saved', {
      name: () => 'filename'
    })

    download( saveData, {
      name: 'new-data',
      type: 'json'
    })

`setType` sets or removes the type extension of a file.

    const fileName = setType('text.txt', 'json')     // 'test.json'
    const fileName = setType('text.txt', '')     // 'test'
~~~~
const {open, save, download, setType} = await import('../lib/local-files.js')
Test(() => setType('test.txt', 'json')).shouldBe('test.json')
Test(() => setType('test.txt'), 'does not change type by default').shouldBe('test.txt')
Test(() => setType('test.txt', ''), 'can explicitly remove type').shouldBe('test')
Test(() => setType('foo.bar.baz', 'txt'), 'replaces the type if filename includes period').shouldBe('foo.bar.txt')
~~~~

```
<style>
  input,
  textarea {
    width: 100%;
  }

  textarea {
    min-height: 100px;
  }

  .drag-file {
    display: inline-block;
    width: 32px;
    height: 32px;
    vertical-align: middle;
    font-size: 24px;
    line-height: 32px;
  }

  ._component_ label {
    display: inline-block;
    height: 32px;
    line-height: 32px;
    margin: 0 10px;
  }
</style>
<button data-event="click:_component_.openFile">Open a file...</button>
<button data-event="click:_component_.download">Download</button>
<label>
  Drag to  desktop to download
  <div
    data-bind="attr(title)=_component_.file.name"
    class="drag-file icon-file-empty"
  ></div>
</div>
<input title="file name" data-bind="value=_component_.file.name">
<textarea title="file data" data-bind="value=_component_.file.data"></textarea>
<script>
  const {open, download, makeDraggableFile} = await import('../lib/local-files.js')
  makeDraggableFile(findOne('.drag-file'), () => get('file.data'), {
    name: () => get('file.name'),
    mimeType: 'text/plain'
  })
  set({
    file: {
      name: 'untitled.txt',
      data: 'sample data'
    },
    openFile: async () => {
      set('file', await open())
    },
    download: () => {
      const {data, name} = get().file
      download(data, {name})
    },
  })
</script>
```
*/
/* global FileReader, btoa */
const openDefaults = {
  mimeType: 'text/*',
  timeOut: 5000 // ms
}

const saveDefaults = {
  name: 'untitled',
  type: 'txt',
  mimeType: 'text/plain'
}

function open (config = openDefaults) {
  const input = document.createElement('input')
  let timeOut = 0
  return new Promise((resolve, reject) => {
    const { mimeType } = config
    input.setAttribute('type', 'file')
    input.setAttribute('accept', mimeType)
    input.addEventListener('change', () => {
      if (input.value) {
        if (config.timeOut) {
          timeOut = setTimeout(() => reject(new Error('save timed out')), config.timeOut)
        }
        const reader = new FileReader()
        reader.onload = (event) => {
          resolve({
            name: input.files[0].name,
            data: event.target.result
          })
          clearTimeout(timeOut)
        }
        reader.readAsText(input.files[0])
      }
    })
    input.click()
  })
}

function setType (name = 'untitled', type = undefined) {
  if (type !== undefined) {
    const parts = name.split('.')
    if (parts.length > 1) {
      parts.pop()
    }
    if (type) {
      parts.push(type)
    }
    name = parts.join('.')
  }
  return name
}

const a = document.createElement('a')

function download (data, config = saveDefaults) {
  let { name, type } = Object.assign({ ...saveDefaults }, config)
  name = setType(name, type)

  a.setAttribute('download', name)
  const dataUrl = 'data:application/octet-stream;base64,' + btoa(encodeURIComponent(data))
  a.setAttribute('href', dataUrl)
  a.click()
}

function makeDraggableFile (element, data, config = saveDefaults) {
  const { name } = config
  element.draggable = 'true'
  element.addEventListener('dragstart', evt => {
    // evt.dataTransfer.setData(mimeType, typeof data === 'function' ? data() : data)
    const fileName = typeof name === 'function' ? name() : name
    const content = typeof data === 'function' ? data() : data
    evt.dataTransfer.setData('DownloadURL', `application/octet-stream:${fileName}:data:application/octet-stream;base64,${btoa(encodeURIComponent(content))}`)
  })
}

export {
  open,
  makeDraggableFile,
  setType,
  download
}

/**
# Filecoin Demo

<b8r-component path="../components/filecoin.js"></b8r-component>
*/

export default {
  css: `
    ._component_ {
      display: inline-flex;
      flex-direction: column;
      padding: 10px;
      width: 480px;
    }

    ._component_ img {
      width: 200px;
      height: 200px;
      padding: 20px;
    }

    ._component_ head,
    ._component_ label,
    ._component_ h4,
    ._component_ a {
      display: flex;
    }

    ._component_ .column {
      flex-direction: column;
    }

    ._component_ textarea {
      align-self: stretch;
    }

    ._component_ textarea:not(:placeholder-shown) {
      filter: blur(5px);
    }

    ._component_ head > :last-child {
      padding: 0;
    }

    ._component_ .name {
      font-style: bold;
    }

    ._component_ .icon-spinner5 {
      color: var(--accent-color);
      display: inline-block;
      animation: spin-clockwise 2s infinite linear;
    }
  `,
  view({head, label, span, input, textarea, img, h4, div, a, button} ) {
    return [
      head(
        img({src: 'https://w3s.link/ipfs/bafybeid7p25n6motbkrida32a7ftuf2jtcrpsabiir3drtpxdonwl3pgva/bindinator-logo.svg'}),
        label(
          {
            class: 'column elastic'
          },
          span('FileCoin API Key'),
          textarea({
            placeholder: 'paste your filecoin api key here',
            class: 'elastic',
            bindValue: '_component_.apiKey',
          }),
          button(
            'List Files',
            {
              bindEnabledIf: '_component_.apiKey',
              onClick: '_component_.listUploads'
            }
          )
        ),
      ),
      h4(
        {
          bindShowIf: '_component_.uploads'
        },
        span('Files'),
      ),
      div(
        span({class: 'icon-spinner5'}),
        {
          style: 'text-align: center',
          bindShowIf: '_component_.loading'
        }
      ),
      a(
        span({
          class: 'name',
          bindText: '.name'
        }),
        {
          'target': '_blank',
          bindList: '_component_.uploads',
          bindHref: 'https://w3s.link/ipfs/${.cid}',
        },
        span({
          class: 'elastic'
        }),
        span({
          '_component_.setIcon': '.type'
        })
      ),
      label(
        {
          bindShowIf: '_component_.uploads'
        },
        span(
          'Upload a File',
          {
            style: 'display: block'
          }
        ),
        input(
          {
            type: 'file',
            class: 'elastic',
            bindDisabledIf: '_component_.uploading',
            bindValue: '_component_.file'
          }
        ),
        button(
          'Upload',
          {
            bindEnabledIf: '_component_.file',
            onClick: '_component_.upload'
          }
        )
      ),
    ]
  },

  async initialValue({b8r, component, findOne}) {
    const fileInput = findOne('input[type="file"]')
    return {
      uploads: null,
      loading: false,
      uploading: false,
      file: null,
      apiKey: '',
      async listUploads() {
        component.data.loading = true
        const request = await fetch('https://api.web3.storage/user/uploads', {
          method: 'GET',
          headers: {
            authorization: `Bearer ${component.data.apiKey}`
          },
        })
        component.data.uploads = request.ok ? await request.json() : null
        component.data.loading = false
      },
      setIcon(elt, type) {
        switch(type) {
          case 'Car':
            elt.classList.add('icon-folder')
            break;
          default:
            elt.classList.add('icon-file-empty2')
        }
      },
      async upload() {
        if (!fileInput.value) {
          throw new Error('no file available to upload')
        }
        component.data.uploading = true
        const outcome = await fetch('https://api.web3.storage/upload', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${component.data.apiKey}`,
            'X-NAME': escape(fileInput.files[0].name)
          },
          body: fileInput.files[0]
        })
        component.data.uploading = false
        fileInput.value = null
        component.data.listUploads()
      }
    }
  },
}
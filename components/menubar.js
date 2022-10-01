
import { update } from '../lib/shortcuts.js'

export default {
  css: `
  .menubar-component {
    height: 30px;
    display: flex;
    background-color: var(--input-bg-color);
    list-style: none;
    margin: 0;
    padding: 0 4px;
    border-bottom: 1px solid var(--black-10);
    box-sizing: border-box;
    z-index: 1;
    position: relative;
    flex: 0 0 auto;
  }

  ul.menubar-component {
    max-width: initial;
  }

  .menubar-component a {
    border: none;
  }

  .menubar-component [data-shortcut] {
    display: flex;
    width: 100%;
  }

  .menubar-component [data-shortcut]:after {
    content: attr(data-shortcut-description);
    text-align: right;
    width: 100%;
    margin-left: 30px;
    color: var(--accent-color);
  }

  .menubar-component * {
    box-sizing: border-box;
    transition: 0.1s;
  }

  .menubar-component li {
    position: relative;
    cursor: default;
    margin: 0;
    padding: 2px 10px;
    display: inline-flex;
    align-items: center;
    height: 30px;
    line-height: 26px;
    white-space: nowrap;
    min-width: 40px;
  }

  .menubar-component li.open {
    background-color: var(--light-accent-color);
  }

  .menubar-component li:active {
    background-color: var(--accent-color);
  }

  .menubar-component ul {
    position: absolute;
    padding: 0;
    margin: 0 -8px;
    top: 29px;
    background-color: var(--content-bg-color);
    border: 1px solid var(--black-20);
    display: flex;
    flex-direction: column;
    display: none;
    box-shadow: 1px 3px 4px 0 rgba(0,0,0,0.5);
    opacity: 0;
  }

  .menubar-component ul ul {
    z-index: 1;
    top: 0;
    left: calc(90%);
  }

  .menubar-component li.open > ul {
    display: block;
    opacity: 1.0;
  }

  .menubar-component li.separator {
    background-color: var(--black-20);
    height: 1px;
    padding: 0;
    margin: 4px 0;
  }

  .menubar-component ul li {
    display: flex;
  }

  .menubar-component ul li > a {
    color: inherit;
    background: none;
  }

  .menubar-component ul li > *:first-child {
    flex-grow: 1;
  }

  .menubar-component ul li > *:not(:first-child) {
    margin-left: 8px;
  }
  `,
  view: () => [
    {
      dataChildren: true,
      'onMouseup,keydown(Space)': 'menubar.action',
      'onFocus,mouseover,mousedown': 'menubar.open',
      'onBlur,keydown(Escape)': 'menubar.close'
    }
  ],
  load ({ b8r, component, find }) {
    find('[data-event]').forEach(elt => {
      var handlerDef = elt.dataset.event
      if (elt.dataset.shortcut) {
        handlerDef = handlerDef.replace(/\bmenuclick\b([^:]*):/, 'shortcut,mouseup,keydown(Space)$1:')
      } else {
        handlerDef = handlerDef.replace(/\bmenuclick\b([^:]*):/, 'mouseup,keydown(Space)$1:')
      }
      if (elt.matches('li')) {
        elt.dataset.event = handlerDef
      } else {
        elt.closest('li').dataset.event = handlerDef
        if (elt.dataset.event) {
          delete elt.dataset.event
        }
      }
    })
    // keyboard navigation
    b8r.makeArray(component.querySelectorAll('li:not(.separator)')).forEach(elt => elt.setAttribute('tabindex', 0))
    update()
    function closeAllMenus () {
      b8r.off(document.body, 'mousedown', 'menubar', 'close')
      b8r.find('.menubar-component.open,.menubar-component .open').forEach(elt => elt.classList.remove('open'))
    }
    b8r.reg.menubar = {
      action (evt) {
        if (!evt.target.matches('.menubar-component') && !evt.target.parentElement.matches('.menubar-component')) {
          closeAllMenus()
        }
      },
      open (evt) {
        component.style.zIndex = b8r.findHighestZ()
        const li = evt.target.closest('li')
        if (!li) {
          return
        }
        if (li.parentElement.matches('.menubar-component.open') && evt.type === 'mousedown') {
          closeAllMenus()
          return
        }
        if (li.closest('.menubar-component.open') || evt.type !== 'mouseover') {
          const menubar = evt.target.closest('.menubar-component')
          menubar.classList.add('open')
          b8r.on(document.body, 'mousedown', 'menubar', 'close')
          menubar.querySelectorAll('.open').forEach(elt => elt.classList.remove('open'))
          if (evt.target.matches('li')) {
            evt.target.classList.add('open')
          }
          b8r.findAbove(evt.target, 'li', '.menubar-component').forEach(elt => elt.classList.add('open'))
        }
      },
      close (evt) {
        if (!evt || !evt.relatedTarget || !evt.relatedTarget.closest('.menubar-component')) {
          closeAllMenus()
        }
      }
    }
  }
}

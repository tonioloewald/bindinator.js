import('../web-components/select.js')

export default {
  html: `
    <b8r-select-bar
      data-bind="value=_component_.preference" 
      data-event="change:_component_.setDarkmode"
    >
      <b8r-option value="light" title="light theme">🌕</b8r-option>
      <b8r-option value="auto" title="auto">🌗</b8r-option>
      <b8r-option value="dark" title="dark theme">🌒</b8r-option>
    </b8r-select-bar>
  `,
  initialValue: ({get}) => {
    const darkmodeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const setDarkmode = () => {
      const {preference} = get()
      const darkmode = preference === 'dark' || (darkmodeQuery.matches && preference === 'auto')
      document.body.classList.toggle('darkmode', darkmode)
    }
    const [,, mode] = window.location.href.match(/(&|\?)darkmode=(true|false)/) || []
    const preference = typeof mode !== 'string' ? 'auto' : (mode === 'true' ? 'dark' : 'light')
    darkmodeQuery.addListener(setDarkmode)
    return {
      active: false,
      preference,
      setDarkmode
    }
  },
  load: ({get}) => {
    get().setDarkmode()
  }
}
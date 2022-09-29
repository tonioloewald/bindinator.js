/**
# Phone Number Input

This is widget for entering phone-numbers that provides a keyboard-navigable menu
for country codes. If it is assigned a phone number it will look
up the country code (if provided) or just use its current country
code.

You can set the default `country` and `placeholder` as attributes.

Note that some countries share the same code, e.g. the US and Canada)
so this guessing is not perfect.

If you try entering phone numbers in the `<input type="tel">` it may
fight you (because the phone input field won't accept a phone number
with a missing or non-existing country dialCode). Try pasting the
number into the field instead.

The input field does not accept non-numeric entries.

```
<b8r-input-phone
  country="au"
  data-bind="value=_component_.phoneNumber"
>
</b8r-input-phone>
<br>
<label>
  &lt;input type="tel">
  <input type="tel" data-bind="value=_component_.phoneNumber"></input>
</label>
<script>
  await import('../web-components/phone.js');
  set({phoneNumber: ''})
</script>
```
*/

import { elements } from '../source/elements.js'
import { makeWebComponent } from '../source/web-components.js'
import countries from './countries.js'

const { _fragment, input, span, select, option } = elements

const notAllowed = /[^\d]/g

export const PhoneNumber = makeWebComponent('b8r-input-phone', {
  attributes: {
    country: 'us',
    value: '',
    placeholder: 'enter phone number'
  },
  props: {
    phoneNumber: ''
  },
  style: {
    ':host': {
      display: 'inline-flex',
      margin: 0,
      font: 'var(--ui-font)',
      fontSize: 'var(--body-font-size)',
      color: 'var(--text-color)',
      padding: 0,
      background: 'var(--input-bg-color)',
      border: 'none',
      boxShadow: 'var(--shadow-outline)',
      transition: 'var(--hover-transition)',
      lineHeight: 'var(--body-line-height)',
      outline: 'var(--focus-outline)'
    },
    input: {
      border: 0,
      background: 'transparent',
      padding: 'var(--input-padding-edges)'
    }
  },
  eventHandlers: {
    change (evt) {
      if (evt.target !== this) {
        return
      }
      const phone = this.value
      const country = countries.find(c => c.code.toLocaleLowerCase() === this.country.toLocaleLowerCase())
      if (!phone.startsWith('+')) {
        this.phoneNumber = phone.replace(notAllowed, '')
      } else if (phone.startsWith(country.dialCode)) {
        this.phoneNumber = phone.substr(country.dialCode.length).replace(notAllowed, '')
      } else {
        const country = countries.find(c => phone.startsWith(c.dialCode))
        if (country) {
          this.country = country.code.toLocaleLowerCase()
          this.phoneNumber = phone.substr(country.dialCode.length).replace(notAllowed, '')
        }
      }
    }
  },
  content: _fragment(
    span(
      {
        style: {
          position: 'relative',
          flex: '0 0 70px',
          width: '70px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 5px'
        }
      },
      span({ class: 'flag', style: 'flex: 0 0' }),
      span({ class: 'dialcode', style: 'flex: 1 1 auto; text-align: right' }),
      span('▼', { style: 'margin-left: 5px; font-size: 75%; opacity: 0.75' }),
      select(
        {
          title: 'select country',
          style: {
            textAlign: 'right',
            color: 'transparent',
            background: 'transparent',
            border: 0,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }
        },
        ...countries.map(({ code, name, flag }) => option(name, { value: code }))
      )
    ),
    input(
      {
        style: {
          flex: '1 1 auto'
        }
      }
    )
  ),
  methods: {
    connectedCallback () {
      const countrySelect = this.shadowRoot.querySelector('select')
      const phoneNumber = this.shadowRoot.querySelector('input')
      countrySelect.addEventListener('change', () => {
        this.country = countries.find(c => c.code === countrySelect.value).code.toLocaleLowerCase()
      })
      phoneNumber.addEventListener('input', () => {
        this.phoneNumber = phoneNumber.value.replace(notAllowed, '')
      })
      phoneNumber.addEventListener('keydown', evt => {
        if (!evt.code.match(/Backspace|Digit\d|Tab/) && !evt.ctrlKey && !evt.metaKey) {
          evt.preventDefault()
        }
      })
    },
    render () {
      const country = countries.find(c => c.code.toLocaleLowerCase() === this.country.toLocaleLowerCase())
      const countrySelect = this.shadowRoot.querySelector('select')
      const phoneNumber = this.shadowRoot.querySelector('input')
      const flagSpan = this.shadowRoot.querySelector('.flag')
      const dialcodeSpan = this.shadowRoot.querySelector('.dialcode')
      phoneNumber.placeholder = this.placeholder
      countrySelect.value = country.code
      flagSpan.textContent = country.flag
      dialcodeSpan.textContent = country.dialCode
      if (phoneNumber.value !== this.phoneNumber) {
        phoneNumber.value = this.phoneNumber
      }
      this.value = country.dialCode + this.phoneNumber
    }
  },
  role: 'input'
})

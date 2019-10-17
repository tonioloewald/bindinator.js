import b8r from '../source/b8r.js'

export const parseHash = () => window.location.hash.substr(1).split('&').reduce((obj, item) => {
  if (item) {
    const [key, value] = item.split('=')
    if (value) obj[key] = value
  } 
  return obj
}, {})

export const serializeObj = obj => b8r.mapKeys(obj, (value, key) => `${key}=${value}`).join('&')
export const parseHash = () => parseObj(window.location.hash.substr(1))

export const parseSearch = () => parseObj(window.location.search.substr(1))

export const parseObj = s => s.split('&').reduce((obj, item) => {
  if (item) {
    const [key, value] = item.split('=')
    if (value) obj[key] = value
  }
  return obj
}, {})

export const serializeObj = obj => Object.keys(obj).map(key => `${key}=${obj[key]}`).join('&')

/**
# Speech

Speak text. Usage:

    import {voicesPromise, speak, stop}
    speak('the rain in spain stays mainly in the plain', 1, 1, 'Alex')
    setTimout(stop, 1000)

*/
/* global SpeechSynthesisUtterance */

const synth = window.speechSynthesis
let voices

export const voicesPromise = new Promise((resolve) => {
  const done = () => {
    voices = synth.getVoices()
    resolve(voices.map(({ name, lang }) => ({ name, lang })))
  }

  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = done
  } else {
    done()
  }
})

export const speak = async (text = '', pitch = 1, rate = 1, voice = false) => {
  synth.cancel()

  if (!text) return
  await voicesPromise

  const utterance = new SpeechSynthesisUtterance(text)
  if (voice) utterance.voice = voices.find(v => v.name === voice)
  utterance.pitch = pitch
  utterance.rate = rate
  synth.speak(utterance)
}

export const stop = () => synth.cancel()

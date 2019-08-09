/**
# importing from the future

Methods in here workaround circular references.
~~~~
const {playSavedMessages} = await import('./b8r.future.js')

const div = b8r.create('div');
div.dataset.event = 'click:future-test.click';
document.body.appendChild(div);
b8r.trigger('click', div);
Test(() => b8r.get('future-test.clickCount')).shouldBe(null)
b8r.register('future-test', {
  click () {
    b8r.increment('future-test.clickCount')
  }
})
await b8r.forceUpdate()
Test(() => b8r.get('future-test.clickCount')).shouldBe(1)
b8r.remove('future-test')
~~~~
*/

export let playSavedMessages = () => {
  throw new Error('playSavedMessages is not ready yet')
}

export const setPlaySavedMessages = (fn) => {
  playSavedMessages = fn
}

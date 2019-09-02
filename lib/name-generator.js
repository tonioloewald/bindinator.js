/**
# Name Generator

See this [blog post](http://loewald.com/blog/2018/07/a-brief-foray-into-random-name-generation/)
*/

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export class NameGenerator {
// data is a map from character-pairs to observed successors,
// consider the examples "how", "now", "brown", "cow"
// the pair "ow" would have the following successors
// [undefined, undefined, "n", undefined] (undefined -> end of word)

  constructor(examples) {
    const data = {'': []};
    examples.
    map(s => s.toLowerCase()).
    forEach(example => {
      let pair = '';
      data[pair].push(example[0]);

      for(let i = 0; i < example.length; i++) {
        pair = pair.substr(-1) + example[i];
        if (! data[pair]) data[pair] = [];
        data[pair].push(example[i + 1]);
      }
    });
    this.generated = [];
    this.data = data;
  }

  generate() {
    let s
    do {
      s = pick(this.data['']);
      let next = pick(this.data[s]);
      while(next){
        s += next;
        next = pick(this.data[s.substr(-2)]);
      } 
    } while (this.generated.includes(s)) 
    this.generated.push(s)
    return s;
  }
}
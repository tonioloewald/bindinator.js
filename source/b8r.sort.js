/**
# Sort Utilities

These are convenient methods that behave a bit like the "spaceship" operator in PHP7.

### Usage

    import {sortAscending, sortDescending} from 'path/to/b8r.sort.js';

    const a = ['b', 'a', 'c'];
    const ascending = a.sort(sortAscending); // ['a', 'b', 'c'];
    const descending = a.sort(sortDescending); // ['c', 'b', 'a'];

    import {makeAscendingSorter, makeDescendingSorter} from 'path/to/b8r.sort.js'
    const beatles = [{name: 'paul'}, {name: 'john'}, {name: 'george'}, {name: 'ringo'}]
    beatles.sort(makeAscendingSorter(beatle => beatle.name)) // [{name: 'george'}, ...]

They're also useful for building custom sort methods:

    // sort an array of objects by title property
    const sorted = array_of_objs.sort((a, b) => sortAscending(a.title, b.title));

~~~~
// title: sortAscending & sortDescending tests
const {sortAscending, sortDescending, makeAscendingSorter, makeDescendingSorter} = b8r;
Test(() => ['c', 'a', 'B'].sort(sortAscending), 'sort strings, ascending').shouldBeJSON(['a','B','c']);
Test(() => ['c', 'a', 'B'].sort(sortDescending), 'sort strings, descending').shouldBeJSON(['c','B','a']);
Test(() => ['3', 1, 2].sort(sortAscending), 'sort mixed types, ascending').shouldBeJSON([1,2,'3']);
Test(() => ['3', 1, 2].sort(sortDescending), 'sort mixed types, descending').shouldBeJSON(['3',2,1]);
const beatles = [{name: 'paul'}, {name: 'john'}, {name: 'george'}, {name: 'ringo'}]
beatles.sort(makeAscendingSorter(beatle => beatle.name))
Test(() => beatles[2].name, 'makeAscendingSorter works').shouldBe('paul')
beatles.sort(makeDescendingSorter(beatle => beatle.name))
Test(() => beatles[3].name, 'makeDescendingSorter works').shouldBe('george')
~~~~
*/

export const sortAscending = (a, b) =>
  typeof a === 'string' || typeof b === 'string'
    ? `${a}`.localeCompare(b) : a > b ? 1 : b > a ? -1 : 0

export const sortDescending = (a, b) =>
  typeof a === 'string' || typeof b === 'string'
    ? `${b}`.localeCompare(a) : a > b ? -1 : b > a ? 1 : 0

const identity = x => x

export const makeAscendingSorter = (getter = identity) => {
  return (a, b) => sortAscending(getter(a), getter(b))
}

export const makeDescendingSorter = (getter = identity) => {
  return (a, b) => sortDescending(getter(a), getter(b))
}
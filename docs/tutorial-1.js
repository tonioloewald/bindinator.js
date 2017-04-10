/**
# Tutorial 1. Quick State

**Caution**: work in progress.

## Setting up a bindinator project

Right now you need the bindinator source and lib directories,
and you probably want components.

Assuming you have copied the lib/ and source/ directories,
your web app's page needs to look like this:

    <head>
      ...
    </head>
    <body>
      ...
      <script src="lib/require.js"></script>
      <script>
        require.autoPreload('source/b8r.js').then(b8r => {
          ...
        });
      </script>
    </body>

b8r lets you register objects -- bind objects to a name -- which allows 
the binding of those objects to DOM elements (i.e. view components).

The following example simply registers an object which the other
examples use, and displays the state of the data every second.

You can try playing with the other examples and then coming back to
see what the data looks like OR you can change the example code and
run it again, which will overwrite the registered data.

```
<pre id="tutorial1-data" data-bind="json=tutorial1">
</pre>
<script>
  b8r.register('tutorial1', {
    range: 5,
    input: 'hello, world',
    hello: () => alert(b8r.get('tutorial1.input')),
    list: [
      {id: 1, first: 'Ernest', last: 'Hemingway'},
      {id: 2, first: 'Arundhati', last: 'Roy'},
      {id: 3, first: 'Ursula', last: 'Le Guin'}
    ]
  });

  const domInterval = require('lib/domInterval.js');
  domInterval(
    component, 
    () => b8r.bindAll(b8r.id('tutorial1-data')), 
    1000
  );
</script>
```

**Aside** you can ignore the domInterval code if you like. domInterval is
simply a wrapper for setInterval that kills the interval after the specified
DOM element leaves the document body.

Once you have b8r loaded, you can bind registered data to the DOM using
`data-bind` attributes, such as this:

```
<h3 data-bind="text=tutorial1.input">
  Placeholder
</h3>
<label>
  A bound input field
  <input 
    data-bind="value=tutorial1.input"
  >
</label><br>
<label>
  A bound range input
  <input 
    type="range" 
    min=0 
    max=10 
    data-bind="value=tutorial1.range"
  >
</label><br>
<label>
  A numeric input bound to the same value as above
  <input 
    type="number" 
    data-bind="value=tutorial1.range"
  >
</label>
```

Notice that the object registered in the previous example is seen in this example.

You can also bind events to registered methods using the `data-event` attribute:

```
<button 
  data-event="click:tutorial1.hello"
>
  Click Me
</button>
```

Finally, b8r allows you to handle lists of objects using the `data-list` attribute, 
`data-list="path.to.list"`. 

b8r will create a clone of the element for every item in the list. If you are using id
paths, updating the list will cause minimal changes to the DOM. Within a list item you 
can bind elements using relative paths:

```
  <ul>
    <li 
      data-list="tutorial1.list:id"
    >
      <span data-bind="text=.last">Last</span>, <span data-bind="text=.first">First</span>
    </li>
  </ul>
  <h3>There's nothing magical about lists!</h3>
  <div 
    data-list="tutorial1.list:id"
  >
    <label>
      <span 
        data-bind="text=.id"
      >
        0
      </span>
      <input 
        style="width: 80px"
        data-bind="value=.first"
      >
      <input 
        style="width: 80px"
        data-bind="value=.last"
      >
    </label>
  </div>
```

To allow for efficient list updates (if you expect the list to change frequently) 
you can specify an **id-path** to identify individual items: `data-list="path.to.list:path.to.id"`.

Typically, the id path will simply be a property of the list item such as id 
(as in the example).

You can try turning on "paint flashing" in the debugging tools to see what happens when you edit the
names in the second list.
*/
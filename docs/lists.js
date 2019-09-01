/**
# List Bindings

`b8r` list bindings are a deceptively simple feature.

Tne simplest cases is straighforward:

```
<div data-list="_component_.list" data-bind="text=."></div>
<script>
  set('list', ['this', 'that', 'the other'])
</script>
```

If you look at the DOM, there will be one copy of the 
list template for each element in the list, and it will have
a data-list-instance based on its corresponding array index.

e.g.

    <div 
      data-bind="text=c#fiddle-xxxx.list[1]" 
      data-orig-display="" 
      data-list-instance="c#fiddle-xxxx.list[1]"
    >
      that
    </div>

Note that in a list instance, binding to `.` gets you the thing itself,
which is useful when binding to simple arrays. In general, `b8r` list
bindings are designed with lists of *objects* in mind.

## Best Practices — id-paths

Ideally, you'll be binding a list of objects each of which has a unique
identifier. You can provide that path to that identifier in the list
binding which allows `b8r` to perform more efficient list updates.


```
<div data-list="_component_.jedi:id">
  <span data-bind="text=.name"></span>
</div>
<script>
  set('jedi', [
    {id: 1, name: "Obi Wan Kenobi"},
    {id: 2, name: "Luke Skywalker"},
    {id: 3, name: "Yoda"},
    {id: 4, name: "Mace Windu"},
    {id: 5, name: "Qui-Gon Jinn"},
  ])
</script>
```

**Note** `data-list="_component_.jedi:id"` — the ":id" is referred
to as the `id-path` of the list binding. This curresponds to `b8r`'s
concept of an `id-path` that specifies an array element in a binding.

In this case `jedi[id=2]` points to:

    {id: 2, name: "Luke Skywalker"}

Now the corresponding list instance looks like this:

    <div 
      data-orig-display="" 
      data-list-instance="c#fiddle-xxxx.jedi[id=2]"
    >
      <span 
        data-bind="text=c#fiddle-xxxx.jedi[id=2].name"
      >
        Luke Skywalker
      </span>
    </div>

### `_auto_`

If you have a list of objects without a unique id, you can simply use use 
`_auto_` as your list id-path and `b8r` will automatically generate a unique
id for each list instance. E.g.

```
<div data-list="_component_.jedi:_auto_">
  <span data-bind="text=.name"></span>
</div>
<script>
  set('jedi', [
    {name: "Obi Wan Kenobi"},
    {name: "Luke Skywalker"},
    {name: "Yoda"},
    {name: "Mace Windu"},
    {name: "Qui-Gon Jinn"},
  ])
</script>
```

## Computed Lists

`b8r` provides seamless support for computed lists, and it looks like this:

    data-list="path.to.method(path.to.sourceList,to.this,to.that):id"

For computed lists to work, you need to provide an `id-path` and the output
list must be a filtered subset of the source list. This makes implementing
**sorted** and **filtered** lists easy and efficient.

### Filtered List

```
<input placeholder="filter names" data-bind="value=_component_.nameFilter">
<div data-list="_component_.filterByName(_component_.jedi,_component_.nameFilter):id">
  <span data-bind="text=.name"></span>
</div>
<script>
  set({
    nameFilter: '',
    filterByName: (list, nameFilter) => {
      nameFilter = nameFilter.toLocaleLowerCase()
      return nameFilter
        ? list.filter(item => item.name.toLocaleLowerCase().includes(nameFilter))
        : list
    },
    jedi: [
      {id: 1, name: "Obi Wan Kenobi"},
      {id: 2, name: "Luke Skywalker"},
      {id: 3, name: "Yoda"},
      {id: 4, name: "Mace Windu"},
      {id: 5, name: "Qui-Gon Jinn"},
    ]
  })
</script>
```

If you need to bind a list computed from scratch (e.g. the equivalent of an
OUTER JOIN), then simply `bind-list` to a path and then stick the computed 
list in that path.

### Sorted (and Filtered) List

Sorted lists work just like any other computered list unless you change
the list items directly, in which case you need to let `b8r` know that the
list has changed (b.g. by "touching" the list via `b8r.touch('path.to.list')`).

In the following example you can edit the names of the Jedi in the list and
it is resorted on a `change` event (e.g. when you leave the field). It could
sort on `input` events as well, but that seems like a bad user experience!

The call to `touchList` also updates the *filtering* so, for example, you
could filter for Jedi named "luke" then rename "Luke Skywalker" as "Bill" and
when you tab out of the field, that record disappears.

```
<input placeholder="filter names" data-bind="value=_component_.nameFilter">
<div data-list="_component_.filterAndSort(_component_.jedi,_component_.nameFilter):id">
  <input data-bind="value=.name" data-event="change:_component_.touchList">
</div>
<script>
  set({
    nameFilter: '',
    touchList() {
      touch('jedi')
    },
    filterAndSort: (list, nameFilter) => {
      nameFilter = nameFilter.toLocaleLowerCase()
      filtered = nameFilter
        ? list.filter(item => item.name.toLocaleLowerCase().includes(nameFilter))
        : list
      return filtered.sort((a, b) => b8r.sortAscending(a.name, b.name))
    },
    jedi: [
      {id: 1, name: "Obi Wan Kenobi"},
      {id: 2, name: "Luke Skywalker"},
      {id: 3, name: "Yoda"},
      {id: 4, name: "Mace Windu"},
      {id: 5, name: "Qui-Gon Jinn"},
    ]
  })
</script>
```

## More Real World Cases to Come

- virtual lists
- nested lists (hint: they work exactly like you'd expect)
- using a computed list to handle detail views (while keeping a "single source of truth")
- editing lists (adding and removing elements, optimising service calls, etc.)
- client-side inner joins (compute them from the one of the source lists)
- client-side outer joins (pick a path, compute the list, stick it in the path)

*/
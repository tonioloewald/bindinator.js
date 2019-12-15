/**
# mysql-to-json

Convert a MySQL file into JSON.

Creates a single object named **tables** which is a map of **names**
to **table** objects.

```
<style>
  ._component_ textarea {
    width: 100%;
    min-height: 400px;
    font-family: Menlo, Monaco, monospace;
  }
</style>
<label>
  <h6>MySQL goes here</h6>
  <textarea data-bind="value=_component_.source"></textarea>
</label>
<button data-event="click:_component_.convert">Convert</button>
<script>
  const {convert} = await import('../utils/mysql-to-json.js')
  set({
    source: '',
    convert: () => {
      console.log(convert(get('source')))
    }
  })
</script>
```
*/

const parseFields = source => (source + ',')
  .match(/([^',]+|'([^'\\]|\\')*'),/g)
  .map(s => s[0] === "'" ? s.substr(1, s.length - 3) : s.substr(0, s.length - 1).trim())

const parseColumns = source => {
  const columns = []
  source
    .split('\n')
    .forEach(col => {
      const name = col.match(/`([^`]+)`/)[1]
      if (col.match(/PRIMARY KEY/)) {
        (columns.find(col => col.name === name) || {}).primaryKey = true
      } else if (col.match(/KEY/)) {
        (columns.find(col => col.name === name) || {}).key = true
      } else {
        columns.push({
          name,
          meta: col.match(/`([^`]*)$/)[1]
        })
      }
    })
  return columns
}

export const convert = source => {
  const tables = {}
  source = source.replace(/#[^\n]*\n/mg, '')
  source = source.replace(/^\s*\n/mg, '')
  const commands = source.match(/(DROP TABLE IF EXISTS (`[^`]*?`);\n|CREATE TABLE (`[^`]*?`) \(([\s\S]*?)\) ([^;]+) ;\n|INSERT INTO (`[^`]*?`) VALUES \((.*?)\);\s*?\n)/mg)
  /* \n|CREATE TABLE (\`[^`]*?\`) \(.*?\) ([^;]+);\n|INSERT INTO (\`[^`]*?\`) VALUES \(.*?\));\n */
  for (const command of commands) {
    const type = command.match(/DROP|CREATE|INSERT/)[0]
    const table = command.match(/`([^`]*?)`/)[1]
    switch (type) {
      case 'DROP':
        delete tables[table]
        break
      case 'CREATE':
        {
          const [, cols, meta] = command.match(/\(\n([\s\S]*?)\n\) ([^;]+) ;\n/)
          const columns = parseColumns(cols)
          const primaryKey = columns.findIndex(col => col.primaryKey)
          tables[table] = {
            columns,
            primaryKey,
            meta,
            rows: []
          }
        }
        break
      case 'INSERT':
      {
        const source = command.match(/VALUES \((.*)\);\s*$/)[1]
        const row = parseFields(source)
        tables[table].rows.push(row)
      }
    }
  }
  return tables
}

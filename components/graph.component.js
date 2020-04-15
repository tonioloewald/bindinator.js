/**
# graph component

```
<label>
    <span>Graph Type</span>
    <b8r-select-bar data-bind="value=_component_.type">
        <b8r-option value="line">Line</b8r-option>
        <b8r-option value="bar">Bar</b8r-option>
    </b8r-select-bar>
</label><br>
<b8r-component path="../components/graph.component.js" data-bind="component(type)=_component_.type"></b8r-component>
<script>
    set('type', 'bar')
</script>
```
*/

import('../web-components/select.js')

const svgns = "http://www.w3.org/2000/svg"
const makeRect = () => document.createElementNS(svgns, 'rect')

export default {
    css: `
    ._component_ {
        --background-color: rgba(255,255,255,0.75);
        --marking-color: rgba(0,0,0,0.25);
        --bar-color: rgba(255,0,0,0.5);
        --line-width: 2;
        --font-family: Helvetica, Sans-serif;
        --text-color: rgba(0,0,0,0.5);
        display: inline-block;
        background-color: var(--background-color);
        padding: 20px;
    }

    ._component_ h4 {
        text-align: center;
        color: var(--text-color);
    }`,
    html: `
    <h4 data-bind="text=_component_.title"></h4>
    <svg data-bind="method(_component_.viewbox)=_component_.width,_component_.height" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g fill="var(--marking-color)">
            <rect x="0" y="49" data-bind="attr(width)=_component_.width" height="1"></rect>
        </g>
        <g data-list="_component_.data" fill="var(--bar-color)" data-bind="show_if(bar)=_component_.type;method(_component_.bars)=.">
        </g>
        <g data-bind="show_if(line)=_component_.type" data-list="_component_.data" fill="none" stroke="var(--bar-color)" stroke-width="var(--line-width)">
            <polyline data-bind="method(_component_.polyline)=."></polyline>
        </g>
    </svg>`,
    initialValue ({ get, findOne }) {  
      return {
        title: 'Widgets v. Sprockets',
        scale: 'Units (1000s)',
        width: 300,
        height: 200,
        barSpacing: 10,
        type: 'line',
        axis: [ 2016, 2017, 2018, 2019, 2020 ],
        values: null,
        data: [
            {
                name: 'widgets',
                strokeWidth: 4,
                cells: [ 10, 30, 25, 40, 45 ],
            },
            {
                name: 'sprockets',
                color: 'rgba(0,0,255,0.25)',
                cells: [ 15, 20, 23, 20, 22 ],
            }
        ],
        maxValue() {
            const {values, data} = get()
            return Math.max(...(values || data.map(datum => datum.cells).flat()))
        },
        minValue() {
            const {values, data} = get()
            return Math.min(...(values || [0, ...data.map(datum => datum.cells).flat()]))
        },
        viewbox(elt, [width, height]) {
            // offsets to prevent clipping at edges; TODO make them configurable
            elt.setAttribute('viewBox', `${-5} ${-5} ${width + 10} ${height + 10}`)
            elt.style.margin = '-5px'
            elt.setAttribute('width', width + 'px')
        },
        bars(element, {name, cells, color}) {
            element.textContent = ''
            const {type, width, height, barSpacing, axis} = get()
            const max = get().maxValue()
            const min = get().minValue()
            const barWidth = (width + barSpacing)/cells.length
            cells.forEach((value, idx) => {
                const bar = makeRect()
                const barHeight = height * value/max
                bar.setAttribute('y', height - barHeight)
                bar.setAttribute('x', idx * barWidth)
                bar.setAttribute('height', barHeight)
                bar.setAttribute('width', barWidth - barSpacing)
                bar.setAttribute('fill', color)
                bar.setAttribute('aria-label', `${name}: ${value} at ${axis[idx]}`)
                element.append(bar)
            })
        },
        polyline (element, {cells, color, strokeWidth, name}) {
            if (cells.length < 2) return
            const {width, height, type} = get()
            const max = get().maxValue()
            const min = get().minValue()
            const size = cells.length - 1
            const points = cells.map(v => v/max).map(x => height - x * height).map((x, idx) => `${idx / size * width},${x}`).join(' ')
            element.setAttribute('points', points)
            element.setAttribute('aria-label', name)
            if(color) element.setAttribute('stroke', color)
            if(strokeWidth) element.setAttribute('stroke-width', strokeWidth)
        },
      }
    }
  }
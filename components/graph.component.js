/**
# graph component

When I was working on my [COVID-19 example](./?source=covid-19.component.html), I was flummoxed
by how bad all the graph libraries I tried were. E.g. chart.js just mysteriously didn't work.
This seemed like an opportunity to leverage some of the SVG binding trickery that I had used
for more [frivolous purposes](./?source=timeline.component.html).

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
    import('../lib/tooltips.js')
    set('type', 'bar')
</script>
```
*/

import('../web-components/select.js')

const svgns = "http://www.w3.org/2000/svg"
const makeRect = () => document.createElementNS(svgns, 'rect')
const makeText = () => document.createElementNS(svgns, 'text')

export default {
    css: `
    ._component_ {
        --background-color: rgba(255,255,255,0.75);
        --marking-color: rgba(0,0,0,0.5);
        --marking-font-size: 12px;
        --bar-color: rgba(255,0,0,0.5);
        --line-width: 2;
        --font-family: Helvetica, Sans-serif;
        --text-color: rgba(0,0,0,0.5);
        display: inline-block;
        background-color: var(--background-color);
        padding: 20px;
    }

    ._component_ text {
        fill: var(--marking-color);
        font-size: var(--marking-font-size);
    }

    ._component_ h4,
    ._component_ h5 {
        text-align: center;
        color: var(--text-color);
        margin: 0;
    }`,
    html: `
    <h4 data-bind="text=_component_.title"></h4>
    <h5 data-bind="text=_component_.scale"></h5>
    <svg data-bind="method(_component_.viewbox)=_component_.width,_component_.height" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <g fill="var(--marking-color)" data-bind="method(_component_.markLines)=_component_.marks"></g>
        <g data-list="_component_.data" fill="var(--bar-color)" data-bind="show_if(bar)=_component_.type;method(_component_.bars)=."></g>
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
        logarithmic: false,
        marks: [0, 25, 50],
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
        calculateY(value, min, max) {
            const {height, logarithmic} = get()
            return logarithmic
                ? height * (Math.log10(value) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))
                : height * (value - min) / (max - min)
        },
        maxValue() {
            const {marks, data} = get()
            return Math.max(...marks, ...data.map(datum => datum.cells).flat())
        },
        minValue() {
            const {marks, data, logarithmic} = get()
            return logarithmic ? 1 : Math.min(...marks, ...data.map(datum => datum.cells).flat())
        },
        viewbox(elt, [width, height]) {
            // offsets to prevent clipping at edges; TODO make them configurable
            elt.setAttribute('viewBox', `${-20} ${-20} ${width + 40} ${height + 40}`)
            elt.style.margin = '-5px'
            elt.setAttribute('width', width + 'px')
        },
        markLines(element, marks) {
            element.textContent = ''
            const {width, height, calculateY} = get()
            const max = get().maxValue()
            const min = get().minValue()
            marks.forEach(value => {
                const y = height - calculateY(value, min, max)
                const mark = makeRect()
                mark.setAttribute('x', 0)
                mark.setAttribute('y', y)
                mark.setAttribute('height', 1)
                mark.setAttribute('width', width)
                element.append(mark)

                const text = makeText()
                text.textContent = value
                text.setAttribute('x', width + 5)
                text.setAttribute('y', y + 5)
                element.append(text)
            })
        },
        bars(element, {name, cells, color}) {
            element.textContent = ''
            const {type, width, height, barSpacing, axis, calculateY} = get()
            const max = get().maxValue()
            const min = get().minValue()
            const barWidth = (width + barSpacing)/cells.length
            cells.forEach((value, idx) => {
                const bar = makeRect()
                const barHeight = calculateY(value, min, max)
                bar.setAttribute('y', height - barHeight)
                bar.setAttribute('x', idx * barWidth)
                bar.setAttribute('height', barHeight)
                bar.setAttribute('width', barWidth - barSpacing)
                if (color) bar.setAttribute('fill', color)
                bar.setAttribute('aria-label', `${name}: ${value} at ${axis[idx]}`)
                element.append(bar)
            })
        },
        polyline (element, {cells, color, strokeWidth, name}) {
            if (cells.length < 2) return
            const {width, height, calculateY} = get()
            const max = get().maxValue()
            const min = get().minValue()
            const size = cells.length - 1
            const points = cells.map(v => height - calculateY(v, min, max)).map((y, idx) => `${idx / size * width},${y}`).join(' ')
            element.setAttribute('points', points)
            element.setAttribute('aria-label', name)
            if(color) element.setAttribute('stroke', color)
            if(strokeWidth) element.setAttribute('stroke-width', strokeWidth)
        },
      }
    }
  }
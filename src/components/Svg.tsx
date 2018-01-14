import { DOMSource, h } from '@cycle/dom'
import * as R from 'ramda'
import { VNode } from 'snabbdom/vnode'
import xs, { Stream } from 'xstream'
import SelectionIndicator from './SelectionIndicator'
import { State } from '../actions'
import { Point, Item } from '../interfaces'
import '../styles/svg.styl'

export interface Sources {
  DOM: DOMSource
  drawingItem: Stream<Item>
  state: Stream<State>
}

export interface Sinks {
  DOM: Stream<VNode>
  svg: Stream<SVGSVGElement>
  rawDown: Stream<Point>
  rawDblclick: Stream<Point>
  rawWheel: Stream<{ pos: Point; deltaY: number }>
  resizer: Stream<string>
}

export default function Svg(sources: Sources): Sinks {
  const domSource = sources.DOM
  const svgdom = domSource.select('.svg')
  const state$ = sources.state
  const selectedItems$ = state$.map(s => s.items.filter(item => s.sids.has(item.id)))
  svgdom.events('dragover', { preventDefault: true }).addListener({
    next(e) {
      e.dataTransfer.dropEffect = 'copy'
    },
  })

  const file$ = svgdom
    .events('drop', { preventDefault: true })
    .map(e => e.dataTransfer.files[0])
    .filter(R.identity)

  // TODO handle open file
  file$.debug('file').addListener({})

  const transform$ = sources.state.map(s => s.transform)

  const rawDown$ = domSource.events('mousedown')
  const rawDblclick$ = domSource.events('dblclick')
  const rawWheel$ = domSource.events('wheel').map(e => ({ pos: e, deltaY: e.deltaY }))

  const selectionIndicator = SelectionIndicator({
    DOM: domSource,
    selectedItems: selectedItems$,
    transform: transform$,
  })

  const vdom$ = xs
    .combine(sources.state, sources.drawingItem, selectionIndicator.DOM)
    .map(([{ items, zlist, transform }, drawingItem, selectionIndicator]) =>
      h('svg.svg', [
        h(
          'g',
          { attrs: { transform: String(transform) } },
          [
            h('line', { attrs: { x1: 0, y1: 0, x2: 300, y2: 0, stroke: 'red' } }),
            h('line', { attrs: { x1: 0, y1: 0, x2: 0, y2: 300, stroke: 'red' } }),
            h(
              'g',
              { attrs: { role: 'items' } },
              zlist
                .map(itemId => items.get(itemId))
                .map(item => item.render())
                .toArray(),
            ),
            drawingItem && drawingItem.render(),
            selectionIndicator,
          ].filter(R.identity),
        ),
      ]),
    )
  return {
    DOM: vdom$,
    svg: svgdom.element() as any,
    rawDown: rawDown$,
    rawDblclick: rawDblclick$,
    rawWheel: rawWheel$,
    resizer: selectionIndicator.resizer,
  }
}

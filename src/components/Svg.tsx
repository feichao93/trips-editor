import { DOMSource, h } from '@cycle/dom'
import { OrderedMap } from 'immutable'
import * as R from 'ramda'
import { VNode } from 'snabbdom/vnode'
import xs, { Stream } from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import SelectionIndicator from './SelectionIndicator'
import { State } from '../actions'
import { Point, PolygonItem, ItemId, Item } from '../interfaces'
import '../styles/svg.styl'
import { invertPos } from '../utils/common'

export interface Sources {
  DOM: DOMSource
  drawingItem: Stream<PolygonItem>
  state: Stream<State>
  selectedItems: Stream<OrderedMap<ItemId, Item>>
}

export interface Sinks {
  DOM: Stream<VNode>
  svg: Stream<SVGSVGElement>
  down: Stream<Point>
  rawDown: Stream<Point>
  dblclick: Stream<Point>
  rawDblclick: Stream<Point>
  rawWheel: Stream<{ pos: Point; deltaY: number }>
}

function Item(item: PolygonItem): VNode {
  if (item == null) {
    return null
  }
  return h('polygon', {
    key: item.id,
    attrs: {
      stroke: item.stroke,
      'stroke-linejoin': 'round',
      'stroke-width': item.strokeWidth,
      opacity: item.opacity,
      fill: item.fill,
      points: item.points.map(p => `${p.x},${p.y}`).join(' '),
    },
  })
}

export default function Svg(sources: Sources): Sinks {
  const domSource = sources.DOM
  const svgdom = domSource.select('.svg')

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
  const down$ = invertPos(rawDown$, transform$)
  const rawDblclick$ = domSource.events('dblclick')
  const rawWheel$ = domSource.events('wheel').map(e => ({ pos: e, deltaY: e.deltaY }))
  const dblclick$ = invertPos(rawDblclick$, transform$)

  const vdom$ = xs
    .combine(sources.state, sources.drawingItem, sources.selectedItems)
    .map(([{ items, zlist, transform }, drawingItem, selectedItems]) =>
      h('svg.svg', [
        h(
          'g',
          { attrs: { transform: String(transform) } },
          [
            h('line', { attrs: { x1: 0, y1: 0, x2: 1000, y2: 0, stroke: 'red' } }),
            h('line', { attrs: { x1: 0, y1: 0, x2: 0, y2: 1000, stroke: 'red' } }),
            h(
              'g',
              { attrs: { role: 'items' } },
              zlist
                .map(itemId => items.get(itemId))
                .map(Item)
                .toArray(),
            ),
            Item(drawingItem),
            SelectionIndicator({ selectedItems, transform }),
          ].filter(R.identity),
        ),
      ]),
    )
  return {
    DOM: vdom$,
    svg: svgdom.element() as any,
    down: down$,
    rawDown: rawDown$,
    dblclick: dblclick$,
    rawDblclick: rawDblclick$,
    rawWheel: rawWheel$,
  }
}

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

export interface Sources {
  DOM: DOMSource
  paint: Stream<{ transform: d3.ZoomTransform }>
  drawingItem: Stream<PolygonItem>
  state: Stream<State>
  selectedItems: Stream<OrderedMap<ItemId, Item>>
}

export interface Sinks {
  DOM: Stream<VNode>
  svg: Stream<SVGSVGElement>
  move: Stream<Point>
  down: Stream<Point>
  up: Stream<Point>
  click: Stream<Point>
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

function toPos(
  mouseEvent$: Stream<MouseEvent>,
  paintSouce: Stream<{ transform: d3.ZoomTransform }>,
): Stream<Point> {
  return mouseEvent$.compose(sampleCombine(paintSouce)).map(([event, paint]) => {
    const [x, y] = paint.transform.invert([event.x, event.y])
    return { x, y }
  })
}

export default function Svg(sources: Sources): Sinks {
  const domSource = sources.DOM
  const paintSource = sources.paint
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

  const window$ = domSource.select('document').element()

  const move$ = toPos(domSource.events('mousemove'), paintSource)
  const down$ = toPos(domSource.events('mousedown'), paintSource)
  const up$ = toPos(domSource.events('mouseup'), paintSource)
  const click$ = toPos(domSource.events('click'), paintSource)

  const vdom$ = xs
    .combine(sources.state, sources.paint, sources.drawingItem, sources.selectedItems)
    .map(([{ items, zlist }, { transform }, drawingItem, selectedItems]) =>
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
    move: move$,
    down: down$,
    up: up$,
    click: click$,
  }
}

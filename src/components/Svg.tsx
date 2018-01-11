import { DOMSource, h } from '@cycle/dom'
import { VNode } from 'snabbdom/vnode'
import xs, { Stream } from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import { State } from '../actions'
import { Point, PolygonItem } from '../interfaces'
import '../styles/svg.styl'

export interface Sources {
  DOM: DOMSource
  paint: Stream<{ transform: d3.ZoomTransform }>
  drawingItem: Stream<PolygonItem>
  state: Stream<State>
}

export interface Sinks {
  DOM: Stream<VNode>
  svg: Stream<SVGSVGElement>
  move: Stream<Point>
  down: Stream<Point>
  up: Stream<Point>
}

function itemView(item: PolygonItem) {
  if (item == null) {
    return ''
  }
  return h('polygon', {
    key: item.id,
    attrs: {
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
  const svg$ = domSource.select('.svg').element() as Stream<any>
  const move$ = toPos(domSource.events('mousemove'), paintSource)
  const down$ = toPos(domSource.events('mousedown'), paintSource)
  const up$ = toPos(domSource.events('mouseup'), paintSource)

  const vdom$ = xs.combine(sources.state, sources.paint, sources.drawingItem).map(
    ([{ items }, { transform }, drawingItem]) =>
      h('svg.svg', [
        h('g', { attrs: { transform: String(transform) } }, [
          h('line', { attrs: { x1: 0, y1: 0, x2: 1000, y2: 0, stroke: 'red' } }),
          h('line', { attrs: { x1: 0, y1: 0, x2: 0, y2: 1000, stroke: 'red' } }),
          h('g[role=items]', items.map(itemView).toArray()),
          // itemView(drawingItem), // TODO LAST EDIT HERE
        ]),
      ]),
    // <svg
    //   className="svg"
    //   // ref={node => (this.svgNode = node)}
    //   // onDragOver={this.onDragOver}
    //   // onDrop={this.onDrop}
    //   // {...this.handlers}
    //   // style={{ cursor }}
    // >
    //   <g transform={String(transform)}>
    //     <line x1="0" y1="0" x2="1000" y2="0" stroke="red" />
    //     <line x1="0" y1="0" x2="0" y2="1000" stroke="red" />
    //     <g role="items" />
    //     {itemView(item)}
    //     {/* <Items items={items} zlist={zlist} /> */ ''}
    //     {/* {drawingItemHtml} */ ''}
    //     {/* {selectedItemsIndicator} */ ''}
    //     {/* <Addons addons={addons} transform={transform} /> */ ''}
    //   </g>
    // </svg>
  )
  return {
    DOM: vdom$,
    svg: svg$,
    move: move$,
    down: down$,
    up: up$,
  }
}

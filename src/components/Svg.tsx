import { DOMSource, h } from '@cycle/dom'
import isolate from '@cycle/isolate'
import { VNode } from 'snabbdom/vnode'
import xs, { Stream } from 'xstream'
import SelectionIndicator from './SelectionIndicator'
import VerticesIndicator from './VerticesIndicator'
import { State } from '../actions'
import { Item, Point, Selection } from '../interfaces'
import '../styles/svg.styl'
import Mouse from '../utils/Mouse'

export interface Sources {
  DOM: DOMSource
  mouse: Mouse
  drawingItem: Stream<Item>
  state: Stream<State>
  selection: Stream<Selection>
  transform: Stream<d3.ZoomTransform>
  addons: {
    polygonCloseIndicator: Stream<VNode>
  }
}

export interface Sinks {
  DOM: Stream<VNode>
  rawDown: Stream<Point>
  rawClick: Stream<Point>
  rawDblclick: Stream<Point>
  rawWheel: Stream<{ pos: Point; deltaY: number }>
  whichVertex: Stream<(p: Point) => number>
  whichResizer: Stream<(p: Point) => string>
}

export default function Svg(sources: Sources): Sinks {
  const domSource = sources.DOM
  const svgdom = domSource.select('.svg')
  const state$ = sources.state
  const mouse = sources.mouse
  const transform$ = sources.transform
  const selection$ = sources.selection

  svgdom.events('dragover', { preventDefault: true }).addListener({
    next(e) {
      e.dataTransfer.dropEffect = 'copy'
    },
  })

  const file$ = svgdom
    .events('drop', { preventDefault: true })
    .map(e => e.dataTransfer.files[0])
    .filter(Boolean)

  // TODO handle open file
  file$.debug('file').addListener({})

  const rawDown$ = domSource.select('svg').events('mousedown')
  const rawClick$ = domSource.select('svg').events('click')
  const rawDblclick$ = domSource.select('svg').events('dblclick')
  const rawWheel$ = domSource
    .select('svg')
    .events('wheel')
    .map(e => ({ pos: e, deltaY: e.deltaY }))

  const selectionIndicator = (isolate(SelectionIndicator) as typeof SelectionIndicator)({
    DOM: domSource,
    state: state$,
    selection: selection$,
    transform: transform$,
  })

  const verticesIndicator = (isolate(VerticesIndicator) as typeof VerticesIndicator)({
    DOM: domSource,
    state: state$,
    mouse,
    selection: selection$,
    transform: transform$,
  })

  const vdom$ = xs
    .combine(
      state$,
      mouse.cursor$,
      transform$,
      sources.drawingItem,
      // TODO why the following two streams need `startWith`
      selectionIndicator.DOM.startWith(null),
      verticesIndicator.DOM.startWith(null),
      sources.addons.polygonCloseIndicator,
    )
    .map(
      ([
        { items, zlist },
        cursor,
        transform,
        drawingItem,
        selectionIndicator,
        verticesIndicator,
        polygonCloseIndicator,
      ]) =>
        h('svg.svg', { style: { cursor } }, [
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
              verticesIndicator,
              selectionIndicator,
              polygonCloseIndicator,
            ].filter(Boolean),
          ),
        ]),
    )
  return {
    DOM: vdom$,
    rawDown: rawDown$,
    rawDblclick: rawDblclick$,
    rawClick: rawClick$,
    rawWheel: rawWheel$,
    whichResizer: selectionIndicator.whichResizer,
    whichVertex: verticesIndicator.whichVertex,
  }
}

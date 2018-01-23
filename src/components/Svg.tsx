import { DOMSource, h } from '@cycle/dom'
import isolate from '@cycle/isolate'
import { VNode } from 'snabbdom/vnode'
import xs, { Stream } from 'xstream'
import AdjustIndicator from './AdjustIndicator'
import SelectionIndicator from './SelectionIndicator'
import VertexInsertIndicator from './VertexInsertIndicator'
import VerticesIndicator from './VerticesIndicator'
import { State } from '../actions'
import { AdjustConfig, Item, Point, Selection } from '../interfaces'
import { ShortcutSource } from '../makeShortcutDriver'
import '../styles/svg.styl'
import AdjustedMouse from '../utils/AdjustedMouse'

export interface Sources {
  DOM: DOMSource
  mouse: AdjustedMouse
  shortcut: ShortcutSource
  drawingItem: Stream<Item>
  state: Stream<State>
  selection: Stream<Selection>
  transform: Stream<d3.ZoomTransform>
  adjustConfigs: Stream<AdjustConfig[]>
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
  nextVertexIndex: Stream<number>
  nextResizer: Stream<string>
  nextVertexInsertIndex: Stream<number>
}

export default function Svg(sources: Sources): Sinks {
  const domSource = sources.DOM
  const svgdom = domSource.select('.svg')
  const state$ = sources.state
  const mouse = sources.mouse
  const shortcut = sources.shortcut
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

  const selectionIndicator = isolate(SelectionIndicator)({
    DOM: domSource,
    mouse,
    state: state$,
    selection: selection$,
    transform: transform$,
  })

  const verticesIndicator = isolate(VerticesIndicator)({
    DOM: domSource,
    state: state$,
    mouse,
    selection: selection$,
    transform: transform$,
  })

  const vertexInsertIndicator = isolate(VertexInsertIndicator)({
    DOM: domSource,
    state: state$,
    mouse,
    shortcut,
    selection: selection$,
    transform: transform$,
  })

  const adjustIndicator = isolate(AdjustIndicator)({
    DOM: domSource,
    mouse,
    transform: transform$,
  })

  const vdom$ = xs
    .combine(
      state$,
      mouse.cursor$,
      transform$,
      sources.drawingItem,
      // TODO why the following streams need `startWith`
      vertexInsertIndicator.DOM.startWith(null),
      selectionIndicator.DOM.startWith(null),
      verticesIndicator.DOM.startWith(null),
      adjustIndicator.DOM,
      sources.addons.polygonCloseIndicator,
    )
    .map(
      ([
        { items, zlist },
        cursor,
        transform,
        drawingItem,
        addPointIndicator,
        selectionIndicator,
        verticesIndicator,
        polygonCloseIndicator,
        adjustIndicator,
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
              addPointIndicator,
              selectionIndicator,
              verticesIndicator,
              polygonCloseIndicator,
              adjustIndicator,
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
    nextResizer: selectionIndicator.nextResizer,
    nextVertexIndex: verticesIndicator.nextVertexIndex,
    nextVertexInsertIndex: vertexInsertIndicator.nextVertexInsertIndex,
  }
}

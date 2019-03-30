import { DOMSource, h } from '@cycle/dom'
import isolate from '@cycle/isolate'
import { VNode } from 'snabbdom/vnode'
import xs, { MemoryStream, Stream } from 'xstream'
import AdjustIndicator from './AdjustIndicator'
import SelectionIndicator from './SelectionIndicator'
import VertexInsertIndicator from './VertexInsertIndicator'
import VerticesIndicator from './VerticesIndicator'
import AddItemAction from '../actions/AddItemAction'
import { FileStat } from '../makeFileDriver'
import { KeyboardSource } from '../makeKeyboardDriver'
import '../styles/svg.styl'
import {
  Action,
  State,
  AdjustConfig,
  ImgItem,
  Item,
  Point,
  AppConfig,
  ComponentSources,
  ComponentSinks,
} from '../interfaces'

type ExtraSinks = {
  rawDown: Stream<Point>
  rawClick: Stream<Point>
  rawDblclick: Stream<Point>
  rawWheel: Stream<{ pos: Point; deltaY: number }>
  svgDOMRectTrigger: Stream<any>
}

export default function Svg(sources: ComponentSources): Partial<ComponentSinks> & ExtraSinks {
  const domSource = sources.DOM
  const svgdom = domSource.select('.svg')
  const state$ = sources.state
  const config$ = sources.config
  const mouse = sources.mouse
  const keyboard = sources.keyboard
  const working = sources.working

  svgdom.events('dragover', { preventDefault: true }).addListener({
    next(e) {
      e.dataTransfer.dropEffect = 'copy'
    },
  })

  const file$ = svgdom
    .events('drop', { preventDefault: true })
    .map(e => e.dataTransfer.files[0])
    .filter(Boolean)

  const addImgItem$ = file$
    .map(file =>
      sources.FILE.filter(stat => stat.file === file)
        .take(1)
        .map(ImgItem.fromImgFileStat)
        .map(item => new AddItemAction(item)),
    )
    .flatten()

  const rawDown$ = domSource.select('svg').events('mousedown')
  const rawClick$ = domSource.select('svg').events('click')
  const rawDblclick$ = domSource.select('svg').events('dblclick')
  const rawWheel$ = domSource
    .select('svg')
    .events('wheel')
    .map(e => ({ pos: e, deltaY: e.deltaY }))

  const selectionIndicator = isolate(SelectionIndicator, '.selection-indicator')(sources)
  const verticesIndicator = isolate(VerticesIndicator, '.vertices-indicator')(sources)
  const vertexInsertIndicator = isolate(VertexInsertIndicator, '.vertex-insert-indicator')(sources)
  const adjustIndicator = isolate(AdjustIndicator, '.adjust-indicator')(sources)

  const indicatorsVdom$ = xs
    .combine(
      selectionIndicator.DOM.startWith(null),
      vertexInsertIndicator.DOM.startWith(null),
      verticesIndicator.DOM.startWith(null),
      adjustIndicator.DOM.startWith(null),
      sources.polygonCloseIndicator,
    )
    .map(([s, vi, v, a, pc]) => h('g.indicators', [s, vi, v, a, pc].filter(Boolean)))

  const itemsVdom$ = xs
    .combine(state$, config$, keyboard.isPressing('`'), working.editing)
    .map(([{ zlist, items }, config, reverseZList, editing]) =>
      h(
        'g.items',
        (reverseZList ? zlist.reverse() : zlist)
          .map(itemId => items.get(itemId))
          .map(item => (editing.has(item.id) ? item.set('opacity', item.opacity * 0.6) : item))
          .map(item => item.render(config))
          .toArray(),
      ),
    )

  const vdom$ = xs
    .combine(itemsVdom$, mouse.cursor$, state$, config$, working.drawing, indicatorsVdom$)
    .map(([items, cursor, { transform }, config, drawingItem, indicators]) =>
      h('svg.svg', { style: { cursor } }, [
        h('g', { attrs: { transform: String(transform) } }, [
          h('line', { attrs: { x1: 0, y1: 0, x2: 300, y2: 0, stroke: 'red' } }),
          h('line', { attrs: { x1: 0, y1: 0, x2: 0, y2: 300, stroke: 'red' } }),
          items,
          h(
            'g.drawing-item',
            [
              drawingItem && drawingItem.set('opacity', drawingItem.opacity * 0.6).render(config),
            ].filter(Boolean),
          ),
          indicators,
        ]),
      ]),
    )
  return {
    DOM: vdom$,
    FILE: file$,
    action: addImgItem$,
    rawDown: rawDown$,
    rawDblclick: rawDblclick$,
    rawClick: rawClick$,
    rawWheel: rawWheel$,
    nextResizer: selectionIndicator.nextResizer,
    nextVertexIndex: verticesIndicator.nextVertexIndex,
    nextVertexInsertIndex: vertexInsertIndicator.nextVertexInsertIndex,
    svgDOMRectTrigger: domSource.select('.svg').events('load'),
  }
}

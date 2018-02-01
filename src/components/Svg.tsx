import { DOMSource, h } from '@cycle/dom'
import isolate from '@cycle/isolate'
import { VNode } from 'snabbdom/vnode'
import xs, { MemoryStream, Stream } from 'xstream'
import AdjustIndicator from './AdjustIndicator'
import SelectionIndicator from './SelectionIndicator'
import VertexInsertIndicator from './VertexInsertIndicator'
import VerticesIndicator from './VerticesIndicator'
import actions, { Action, State } from '../actions'
import { AdjustConfig, ImgItem, Item, Point, Sel, AppConfig } from '../interfaces'
import { FileStat } from '../makeFileDriver'
import { KeyboardSource } from '../makeKeyboardDriver'
import '../styles/svg.styl'
import AdjustedMouse from '../utils/AdjustedMouse'

export interface Sources {
  DOM: DOMSource
  FILE: Stream<FileStat>
  mouse: AdjustedMouse
  keyboard: KeyboardSource
  drawingItem: Stream<Item>
  state: Stream<State>
  sel: Stream<Sel>
  transform: Stream<d3.ZoomTransform>
  adjustConfigs: Stream<AdjustConfig[]>
  config: Stream<AppConfig>
  addons: {
    polygonCloseIndicator$: MemoryStream<VNode>
  }
}

export interface Sinks {
  DOM: Stream<VNode>
  FILE: Stream<File>
  action: Stream<Action>
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
  const keyboard = sources.keyboard
  const transform$ = sources.transform
  const sel$ = sources.sel

  svgdom.events('dragover', { preventDefault: true }).addListener({
    next(e) {
      e.dataTransfer.dropEffect = 'copy'
    },
  })

  const file$ = svgdom
    .events('drop', { preventDefault: true })
    .map(e => e.dataTransfer.files[0])
    .filter(Boolean)

  const addItem$ = file$
    .map(file =>
      sources.FILE.filter(stat => stat.file === file)
        .take(1)
        .map(ImgItem.fromImgFileStat)
        .map(actions.addItem),
    )
    .flatten()

  const rawDown$ = domSource.select('svg').events('mousedown')
  const rawClick$ = domSource.select('svg').events('click')
  const rawDblclick$ = domSource.select('svg').events('dblclick')
  const rawWheel$ = domSource
    .select('svg')
    .events('wheel')
    .map(e => ({ pos: e, deltaY: e.deltaY }))

  const selectionIndicator = isolate(SelectionIndicator)(sources)
  const verticesIndicator = isolate(VerticesIndicator)(sources)
  const vertexInsertIndicator = isolate(VertexInsertIndicator)(sources)
  const adjustIndicator = isolate(AdjustIndicator)(sources)

  const indicatorsVdom$ = xs
    .combine(
      // TODO why the following streams need `startWith`
      selectionIndicator.DOM.startWith(null),
      vertexInsertIndicator.DOM.startWith(null),
      verticesIndicator.DOM.startWith(null),
      adjustIndicator.DOM.startWith(null),
      sources.addons.polygonCloseIndicator$,
    )
    .map(([s, vi, v, a, pc]) => h('g.indicators', [s, vi, v, a, pc].filter(Boolean)))

  const itemsVdom$ = xs
    .combine(state$, sel$, keyboard.isPressing('t'))
    .map(([{ zlist, items }, sel, shallowSelected]) =>
      h(
        'g.items',
        zlist
          .map(itemId => items.get(itemId))
          .map(item => {
            const shallow = shallowSelected && sel.idSet.has(item.id)
            if (shallow) {
              return item.set('opacity', item.opacity * 0.6).render()
            } else {
              return item.render()
            }
          })
          .toArray(),
      ),
    )

  const vdom$ = xs
    .combine(itemsVdom$, mouse.cursor$, transform$, sources.drawingItem, indicatorsVdom$)
    .map(([items, cursor, transform, drawingItem, indicators]) =>
      h('svg.svg', { style: { cursor } }, [
        h('g', { attrs: { transform: String(transform) } }, [
          h('line', { attrs: { x1: 0, y1: 0, x2: 300, y2: 0, stroke: 'red' } }),
          h('line', { attrs: { x1: 0, y1: 0, x2: 0, y2: 300, stroke: 'red' } }),
          items,
          h(
            'g.drawing-item',
            [drawingItem && drawingItem.set('opacity', drawingItem.opacity * 0.6).render()].filter(
              Boolean,
            ),
          ),
          indicators,
        ]),
      ]),
    )
  return {
    DOM: vdom$,
    FILE: file$,
    action: addItem$,
    rawDown: rawDown$,
    rawDblclick: rawDblclick$,
    rawClick: rawClick$,
    rawWheel: rawWheel$,
    nextResizer: selectionIndicator.nextResizer,
    nextVertexIndex: verticesIndicator.nextVertexIndex,
    nextVertexInsertIndex: vertexInsertIndicator.nextVertexInsertIndex,
  }
}

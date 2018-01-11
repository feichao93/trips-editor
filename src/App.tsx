import { h } from '@cycle/dom'
import { DOMSource } from '@cycle/dom'
import isolate from '@cycle/isolate'
import actions from './actions'
import { List, Map, OrderedSet } from 'immutable'
import * as R from 'ramda'
import { VNode } from 'snabbdom/vnode'
import xs, { Stream } from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import Svg from './components/Svg'
import { ItemId, Item, Point, PolygonItem } from './interfaces'
import { PaintSink } from './makePaintDriver'
import { ShortcutSource } from './makeShortcutDriver'
import './styles/app.styl'
import * as d3 from 'd3'
import { Updater, initState } from './actions'

const EmptyComponent = ({ DOM }: { DOM: DOMSource }) => ({ DOM: xs.of('') as any })
const Menubar = EmptyComponent
const Structure = EmptyComponent
const Inspector = EmptyComponent
// const Svg = EmptyComponent
const StatusBar = EmptyComponent

export interface Sources {
  DOM: DOMSource
  paint: Stream<{ transform: d3.ZoomTransform }>
  shortcut: ShortcutSource
}
export interface Sinks {
  DOM: Stream<VNode>
  paint: PaintSink
}

const initInteraction = 'idle'

export default function App(sources: Sources): Sinks {
  const domSource = sources.DOM

  const move$ = xs.create<Point>()
  const down$ = xs.create<Point>()
  const up$ = xs.create<Point>()
  const action$ = xs.create<Updater>()
  const state$ = action$.fold((s, updater) => updater(s), initState)

  const startDrawRect$ = sources.shortcut.shortcut('r', 'rect.start')
  const esc$ = sources.shortcut.shortcut('esc', 'idle')

  const changeInteraction$ = xs.create<string>()
  const interaction$ = changeInteraction$.startWith(initInteraction).debug('interaction')

  const rectStartPos$: Stream<Point> = down$
    .compose(sampleCombine(interaction$))
    .filter(([e, interaction]) => interaction === 'rect.start')
    .map(([pos]) => pos)
    .startWith(null)

  const changeToRectDrawing$ = rectStartPos$.filter(R.identity).mapTo('rect.drawing')
  const finishRectDrawing$ = up$
    .compose(sampleCombine(interaction$))
    .filter(([_, interaction]) => interaction === 'rect.drawing')
    .mapTo('idle')

  const rectMovingPos$ = rectStartPos$
    .map(start =>
      move$
        .compose(sampleCombine(interaction$))
        .filter(([_, interaction]) => interaction === 'rect.drawing')
        .map(([pos]) => pos)
        .startWith(start),
    )
    .flatten()

  const drawingRect$ = xs
    .combine(rectStartPos$, rectMovingPos$)
    .filter(([p1, p2]) => p1 !== null && p2 !== null)
    .map(([{ x: x1, y: y1 }, { x: x2, y: y2 }]) =>
      PolygonItem({
        points: List([{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }]),
      }),
    )
    .startWith(null)

  const drawingItem$ = xs
    .merge(drawingRect$)
    .filter(R.identity)
    .startWith(null)

  const addItemAction$ = finishRectDrawing$
    .compose(sampleCombine(drawingItem$))
    .map(([_, item]) => actions.addItem(item))

  // views
  const menubar = (isolate(Menubar, 'menubar') as typeof Menubar)({ DOM: domSource })
  const structure = (isolate(Structure, 'structure') as typeof Structure)({ DOM: domSource })
  const svg = (isolate(Svg, 'svg') as typeof Svg)({
    DOM: domSource,
    // paint: sources.paint,
    paint: xs.of({ transform: d3.zoomIdentity }),
    drawingItem: drawingRect$,
    state: state$,
  })
  const inspector = (isolate(Inspector, 'inspector') as typeof Inspector)({ DOM: domSource })
  const statusBar = (isolate(StatusBar, 'status-bar') as typeof StatusBar)({ DOM: domSource })

  changeInteraction$.imitate(
    xs.merge(startDrawRect$, esc$, changeToRectDrawing$, finishRectDrawing$),
  )
  move$.imitate(svg.move)
  down$.imitate(svg.down)
  up$.imitate(svg.up)
  action$.imitate(xs.merge(addItemAction$).debug('action'))

  const vdom$ = xs
    .combine(menubar.DOM, structure.DOM, svg.DOM, inspector.DOM, statusBar.DOM)
    .map(components => h('div.app', components))

  return {
    DOM: vdom$,
    paint: xs.combine(svg.svg, interaction$).map(([svg, interaction]) => ({
      svg,
      interaction,
    })),
  }
}

import { DOMSource, h } from '@cycle/dom'
import isolate from '@cycle/isolate'
import * as d3 from 'd3'
import * as R from 'ramda'
import { VNode } from 'snabbdom/vnode'
import xs, { Stream } from 'xstream'
import { Action, initState } from './actions'
import Inspector from './components/Inspector'
import StatusBar from './components/StatusBar'
import Svg from './components/Svg'
import commonInteraction from './interaction/commonInteraction'
import dragItems from './interaction/dragItems'
import drawLine from './interaction/drawLine'
import drawPolygon from './interaction/drawPolygon'
import drawRect from './interaction/drawRect'
import resizeItems from './interaction/resizeItems'
import zoom from './interaction/zoom'
import { InteractionFn, Mouse } from './interfaces'
import { ShortcutSource } from './makeShortcutDriver'
import './styles/app.styl'
import { invertPos } from './utils/common'

const EmptyComponent = (sources: { DOM: DOMSource }) => ({ DOM: xs.of(null) as any })
const Menubar = EmptyComponent
const Structure = EmptyComponent

export interface Sources {
  DOM: DOMSource
  shortcut: ShortcutSource
  mouseup: Stream<MouseEvent>
  mousemove: Stream<MouseEvent>
}
export interface Sinks {
  DOM: Stream<VNode>
  title: Stream<string>
}

const initMode = 'idle'

export default function App(sources: Sources): Sinks {
  const domSource = sources.DOM
  const shortcut = sources.shortcut

  const actionProxy$ = xs.create<Action>()
  const nextModeProxy$ = xs.create<string>()
  const nextResizerProxy$ = xs.create<string>()
  const nextTransformProxy$ = xs.create<d3.ZoomTransform>()

  const resizer$ = nextResizerProxy$.startWith(null)
  const state$ = actionProxy$.fold((s, updater) => updater(s), initState)
  const transform$ = nextTransformProxy$.startWith(d3.zoomIdentity)
  const mode$ = nextModeProxy$.startWith(initMode)

  // 当前选中的元素集合
  const selection$ = state$.map(s => s.items.filter(item => s.sids.has(item.id)))

  const mouse: Mouse = {
    down$: xs.create(),
    rawDown$: xs.create(),
    move$: invertPos(sources.mousemove, transform$),
    rawMove$: sources.mousemove,
    up$: invertPos(sources.mouseup, transform$),
    rawUp$: sources.mouseup,
    click$: xs.create(),
    rawClick$: xs.create(),
    dblclick$: xs.create(),
    rawDblclick$: xs.create(),
    wheel$: xs.create(),
    rawWheel$: xs.create(),
  }

  const interactions: InteractionFn[] = [
    commonInteraction,
    dragItems,
    resizeItems,
    zoom,
    drawRect,
    drawPolygon,
    drawLine,
  ]
  const sinksArray = interactions.map(fn =>
    fn({
      mode: mode$,
      mouse,
      resizer: resizer$,
      shortcut,
      state: state$,
      selection: selection$,
      transform: transform$,
    }),
  )
  const addons = Object.assign({}, ...sinksArray.map(sinks => sinks.addons))

  // 目前正在绘制的元素 用于绘制预览
  const drawingItem$ = xs.merge(...sinksArray.map(sinks => sinks.drawingItem).filter(Boolean))

  // views
  const menubar = (isolate(Menubar, 'menubar') as typeof Menubar)({ DOM: domSource })
  const structure = (isolate(Structure, 'structure') as typeof Structure)({ DOM: domSource })
  const svg = (isolate(Svg, 'svg') as typeof Svg)({
    DOM: domSource,
    drawingItem: drawingItem$,
    state: state$,
    transform: transform$,
    addons,
  })
  const inspector = (isolate(Inspector, 'inspector') as typeof Inspector)({
    DOM: domSource,
    selection: selection$,
    state: state$,
  })
  const statusBar = (isolate(StatusBar, 'status-bar') as typeof StatusBar)({
    DOM: domSource,
    state: state$,
    mode: mode$,
  })

  actionProxy$.imitate(
    xs.merge(inspector.action, ...sinksArray.map(sinks => sinks.action).filter(Boolean)),
  )
  nextModeProxy$.imitate(xs.merge(...sinksArray.map(sinks => sinks.nextMode).filter(Boolean)))
  nextTransformProxy$.imitate(
    xs.merge(...sinksArray.map(sinks => sinks.nextTransform).filter(Boolean)),
  )

  nextResizerProxy$.imitate(svg.resizer)
  mouse.rawDown$.imitate(svg.rawDown)
  mouse.down$.imitate(invertPos(svg.rawDown, transform$))
  mouse.rawClick$.imitate(svg.rawClick)
  mouse.click$.imitate(invertPos(svg.rawClick, transform$))
  mouse.rawDblclick$.imitate(svg.rawDblclick)
  mouse.dblclick$.imitate(invertPos(svg.rawDblclick, transform$))
  mouse.rawWheel$.imitate(svg.rawWheel)
  mouse.wheel$.imitate(
    svg.rawWheel.sampleCombine(transform$).map(([{ deltaY, pos }, transform]) => ({
      deltaY,
      pos: {
        x: transform.invertX(pos.x),
        y: transform.invertY(pos.y),
      },
    })),
  )

  const vdom$ = xs
    .combine(menubar.DOM, structure.DOM, svg.DOM, inspector.DOM, statusBar.DOM)
    .map(components => h('div.app', components.filter(R.identity)))

  return {
    DOM: vdom$,
    title: xs.never(),
  }
}

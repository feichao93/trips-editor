import { h } from '@cycle/dom'
import { DOMSource } from '@cycle/dom'
import isolate from '@cycle/isolate'
import * as d3 from 'd3'
import { List, Map, OrderedSet } from 'immutable'
import * as R from 'ramda'
import { VNode } from 'snabbdom/vnode'
import xs, { Stream } from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import actions from './actions'
import { Action, initState } from './actions'
import Inspector from './components/Inspector'
import Svg from './components/Svg'
import dragItems from './interaction/dragItems'
import drawingRect from './interaction/drawingRect'
import zoom from './interaction/zoom'
import { Item, ItemId, Mouse, Point, PolygonItem } from './interfaces'
import { ShortcutSource } from './makeShortcutDriver'
import './styles/app.styl'
import { containsPoint, invertPos, moveItems } from './utils/common'

const EmptyComponent = ({ DOM }: { DOM: DOMSource }) => ({ DOM: xs.of(null) as any })
const Menubar = EmptyComponent
const Structure = EmptyComponent
const StatusBar = EmptyComponent

export interface Sources {
  DOM: DOMSource
  shortcut: ShortcutSource
  mouseup: Stream<MouseEvent>
  mousemove: Stream<MouseEvent>
}
export interface Sinks {
  DOM: Stream<VNode>
}

const initMode = 'idle'

export default function App(sources: Sources): Sinks {
  const domSource = sources.DOM
  const actionProxy$ = xs.create<Action>()
  const changeModeProxy$ = xs.create<string>()

  const state$ = actionProxy$.fold((s, updater) => updater(s), initState)
  const transform$ = state$.map(s => s.transform)

  const rawMouse: Mouse = {
    down$: xs.create(),
    move$: sources.mousemove,
    up$: sources.mouseup,
    dblclick$: xs.create(),
    wheel$: xs.create(),
  }

  const mouse: Mouse = {
    down$: xs.create(),
    move$: invertPos(sources.mousemove, transform$),
    up$: invertPos(sources.mouseup, transform$),
    dblclick$: xs.create(),
    wheel$: xs.empty(), // TODO todo
  }

  const startDrawRect$ = sources.shortcut.shortcut('r', 'rect.start')

  const esc$ = sources.shortcut.shortcut('esc', 'idle')
  const mode$ = changeModeProxy$.startWith(initMode)

  const changeSidsAction$ = mouse.down$
    .compose(sampleCombine(mode$))
    .filter(([_, mode]) => mode === 'idle')
    .map(([pos]) => pos)
    .compose(sampleCombine(state$))
    .map(([pos, state]) => {
      const clickedItems = state.items.filter(item => containsPoint(item, pos))
      const targetItemId = state.zlist.findLast(itemId => clickedItems.has(itemId))
      // const canMoveItem = !clickedItems.isEmpty() && !state.items.get(targetItemId).locked
      if (targetItemId != null) {
        return actions.updateSids([targetItemId])
      } else {
        return actions.clearSids()
      }
    })

  const dragItems$ = dragItems(mouse, mode$, state$)
  const updateZoomAction$ = zoom(rawMouse, mode$, state$)
  // TODO 实现drawPolygon drawPolyline等功能，并统一接口
  const { changeToRectDrawing$, drawingRect$, finishRectDrawing$ } = drawingRect(mouse, mode$)

  const drawingItem$ = xs
    .merge(drawingRect$)
    .filter(R.identity)
    .startWith(null)

  const addItemAction$ = finishRectDrawing$
    .compose(sampleCombine(drawingItem$))
    .map(([_, item]) => actions.addItem(item))

  const selectedItems$ = state$.map(s => s.items.filter(item => s.sids.has(item.id)))

  // views
  const menubar = (isolate(Menubar, 'menubar') as typeof Menubar)({ DOM: domSource })
  const structure = (isolate(Structure, 'structure') as typeof Structure)({ DOM: domSource })
  const svg = (isolate(Svg, 'svg') as typeof Svg)({
    DOM: domSource,
    drawingItem: drawingRect$,
    selectedItems: selectedItems$,
    state: state$,
  })
  const inspector = (isolate(Inspector, 'inspector') as typeof Inspector)({
    DOM: domSource,
    mode: mode$,
    state: state$,
  })

  const statusBar = (isolate(StatusBar, 'status-bar') as typeof StatusBar)({ DOM: domSource })

  changeModeProxy$.imitate(xs.merge(startDrawRect$, esc$, changeToRectDrawing$, finishRectDrawing$))
  mouse.down$.imitate(svg.down)
  mouse.dblclick$.imitate(svg.dblclick)
  rawMouse.down$.imitate(svg.rawDown)
  rawMouse.dblclick$.imitate(svg.rawDblclick)
  rawMouse.wheel$.imitate(svg.rawWheel)
  actionProxy$.imitate(
    xs.merge(addItemAction$, inspector.actions, changeSidsAction$, dragItems$, updateZoomAction$),
  )

  const vdom$ = xs
    .combine(menubar.DOM, structure.DOM, svg.DOM, inspector.DOM, statusBar.DOM)
    .map(components => h('div.app', components.filter(R.identity)))

  return { DOM: vdom$ }
}

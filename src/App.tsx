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
import { Item, ItemId, Point, PolygonItem } from './interfaces'
import { PaintSink } from './makePaintDriver'
import { ShortcutSource } from './makeShortcutDriver'
import './styles/app.styl'
import { containsPoint, moveItems } from './utils/common'

// TODO 测试用的组件
const EmptyComponent = ({ DOM }: { DOM: DOMSource }) => ({ DOM: xs.of(null) as any })
const Menubar = EmptyComponent
const Structure = EmptyComponent
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

const initMode = 'idle'

export default function App(sources: Sources): Sinks {
  const domSource = sources.DOM

  const move$ = xs.create<Point>()
  const down$ = xs.create<Point>()
  const up$ = xs.create<Point>()
  const click$ = xs.create<Point>()
  const action$ = xs.create<Action>()
  const state$ = action$.fold((s, updater) => updater(s), initState)

  const startDrawRect$ = sources.shortcut.shortcut('r', 'rect.start')
  const esc$ = sources.shortcut.shortcut('esc', 'idle')

  const changeMode$ = xs.create<string>()
  const mode$ = changeMode$.startWith(initMode)

  const changeSidsAction$ = down$
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

  const dragStart$ = xs
    .merge(down$.map(pos => ({ type: 'down', pos })), up$.map(pos => ({ type: 'up', pos })))
    .compose(sampleCombine(mode$, state$))
    .filter(([_, mode]) => mode === 'idle')
    .map(([{ type, pos }, mode, state]) => {
      if (type === 'down') {
        const clickedItems = state.items.filter(item => containsPoint(item, pos))
        const targetItemId = state.zlist.findLast(itemId => clickedItems.has(itemId))
        // TODO 目前仅支持单个元素的拖动
        return { startPos: pos, startItems: state.items.filter(item => item.id === targetItemId) }
      } else {
        return null
      }
    })
    .startWith(null)

  const moveItemsAction$ = dragStart$
    .map(dragStart => {
      return move$.map(pos => {
        if (dragStart == null) {
          return null
        } else {
          const { startItems, startPos } = dragStart
          const dx = pos.x - startPos.x
          const dy = pos.y - startPos.y
          const movedItems = moveItems(startItems, dx, dy)
          return actions.moveItems(movedItems)
        }
      })
    })
    .flatten()
    .filter(R.identity)

  const rectStartPos$: Stream<Point> = down$
    .compose(sampleCombine(mode$))
    .filter(([e, mode]) => mode === 'rect.start')
    .map(([pos]) => pos)
    .startWith(null)

  const changeToRectDrawing$ = rectStartPos$.filter(R.identity).mapTo('rect.drawing')
  const finishRectDrawing$ = up$
    .compose(sampleCombine(mode$))
    .filter(([_, mode]) => mode === 'rect.drawing')
    .mapTo('idle')

  const rectMovingPos$ = rectStartPos$
    .map(start =>
      move$
        .compose(sampleCombine(mode$))
        .filter(([_, mode]) => mode === 'rect.drawing')
        .map(([pos]) => pos)
        .startWith(start),
    )
    .flatten()

  const drawingRect$ = xs
    .combine(rectStartPos$, rectMovingPos$, mode$)
    .filter(([p1, p2, mode]) => p1 != null && p2 != null)
    .map(
      ([{ x: x1, y: y1 }, { x: x2, y: y2 }, mode]) =>
        mode === 'rect.drawing'
          ? PolygonItem({
              points: List([
                { x: x1, y: y1 },
                { x: x2, y: y1 },
                { x: x2, y: y2 },
                { x: x1, y: y2 },
              ]),
            })
          : null,
    )
    .startWith(null)
  // .debug('drawing-rect')

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
    // paint: sources.paint,
    paint: xs.of({ transform: d3.zoomIdentity }),
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

  changeMode$.imitate(xs.merge(startDrawRect$, esc$, changeToRectDrawing$, finishRectDrawing$))
  move$.imitate(svg.move)
  down$.imitate(svg.down)
  up$.imitate(svg.up)
  click$.imitate(svg.click)
  action$.imitate(xs.merge(addItemAction$, inspector.actions, changeSidsAction$, moveItemsAction$))

  const vdom$ = xs
    .combine(menubar.DOM, structure.DOM, svg.DOM, inspector.DOM, statusBar.DOM)
    .map(components => h('div.app', components.filter(R.identity)))

  return {
    DOM: vdom$,
    paint: xs.combine(svg.svg, mode$).map(([svg, mode]) => ({
      svg,
      mode,
    })),
  }
}

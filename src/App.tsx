import { DOMSource, h, VNode } from '@cycle/dom'
import isolate from '@cycle/isolate'
import * as d3 from 'd3'
import { List } from 'immutable'
import { identical } from 'ramda'
import xs, { Stream } from 'xstream'
import Inspector from './components/Inspector'
import Menubar from './components/Menubar'
import StatusBar from './components/StatusBar'
import Structure from './components/Structure'
import Svg from './components/Svg'
import interactions from './interaction'
import { Action, AdjustConfig, AppConfig, Item, ItemId, SaveConfig, State } from './interfaces'
import { DialogRequest, FileStat } from './makeFileDriver'
import { KeyboardSource } from './makeKeyboardDriver'
import './styles/app.styl'
import AdjustedMouse from './utils/AdjustedMouse'
import AppHistory, { clearHistory, redo, undo } from './utils/AppHistory'
import { mergeSinks } from './utils/common'
import makeAdjuster from './utils/makeAdjuster'
import UIClass from './utils/UI'

export interface Sources {
  DOM: DOMSource
  FILE: Stream<FileStat>
  keyboard: KeyboardSource
  mouseup: Stream<MouseEvent>
  mousemove: Stream<MouseEvent>
}

export interface Sinks {
  DOM: Stream<VNode>
  FILE: Stream<File | DialogRequest>
  SAVE: Stream<SaveConfig>
}

const initMode = 'idle'
const initConfig: AppConfig = require('./config.yaml')

export default function App(sources: Sources): Sinks {
  const domSource = sources.DOM
  const keyboard = sources.keyboard

  const nextConfigProxy$ = xs.create<AppConfig>()
  const nextClipboardProxy$ = xs.create<Item>()
  const actionProxy$ = xs.create<Action>()
  const nextModeProxy$ = xs.create<string>()
  const nextDrawingItemProxy$ = xs.create<Item>()
  const nextEditingItemIdProxy$ = xs.create<ItemId>()
  const nextResizerProxy$ = xs.create<string>()
  const nextVertexIndexProxy$ = xs.create<number>()
  const nextVertexInsertIndexProxy$ = xs.create<number>()
  const nextAdjustConfigs$ = xs.create<AdjustConfig[]>()
  const nextPolygonCloseIndicator$ = xs.create<VNode>()

  const clipboard$ = nextClipboardProxy$.startWith(null)
  const config$ = nextConfigProxy$.startWith(initConfig)
  const mode$ = nextModeProxy$.startWith(initMode)
  const UI = new UIClass()

  const undo$ = xs
    .merge(UI.intent('undo'), keyboard.shortcut('mod+z').when(mode$, identical('idle')))
    .mapTo<undo>(undo)
  const redo$ = xs
    .merge(
      UI.intent('redo'),
      keyboard.shortcut(['mod+y', 'mod+shift+z']).when(mode$, identical('idle')),
    )
    .mapTo<redo>(redo)
  const clearHistory$ = UI.intent('clear-history').mapTo<clearHistory>(clearHistory)

  const appHistory$ = xs
    .merge<undo, redo, clearHistory, Action>(undo$, redo$, clearHistory$, actionProxy$)
    .fold((h, action) => {
      if (action === undo) {
        return h.undo(h.getLastAction())
      } else if (action === redo) {
        return h.redo(h.getNextAction())
      } else if (action === clearHistory) {
        return h.clearHistory()
      } else {
        return action.prepare(h).apply(action)
      }
    }, new AppHistory())
    .dropRepeats()
    .remember()

  const state$ = appHistory$
    .map(h => h.state)
    .dropRepeats()
    .remember()

  const adjustConfigs$ = nextAdjustConfigs$.startWith([])
  const drawingItem$ = nextDrawingItemProxy$.startWith(null)
  const editingItemId$ = nextEditingItemIdProxy$.startWith(-1)
  const polygonCloseIndicator$ = nextPolygonCloseIndicator$.startWith(null)

  const mouse = new AdjustedMouse(
    state$,
    sources.mousemove,
    sources.mouseup,
    nextResizerProxy$,
    nextVertexIndexProxy$,
    nextVertexInsertIndexProxy$,
  )

  const compSources = {
    appHistory: appHistory$,
    FILE: sources.FILE,
    DOM: domSource,
    UI,
    mouse,
    keyboard,
    config: config$,
    clipboard: clipboard$,
    mode: mode$,
    state: state$,
    drawingItem: drawingItem$,
    editingItemId: editingItemId$,
    adjustConfigs: adjustConfigs$,
    polygonCloseIndicator: polygonCloseIndicator$,
  }

  const menubar = isolate(Menubar, 'menubar')(compSources)
  const svg = isolate(Svg, 'svg')(compSources)
  const structure = isolate(Structure, 'structure')(compSources)
  const inspector = isolate(Inspector, 'inspector')(compSources)
  const statusBar = isolate(StatusBar, 'status-bar')(compSources)

  const interactionSinks = interactions.map(fn => fn(compSources))
  const allSinks = interactionSinks.concat([menubar, structure, inspector, svg, statusBar])

  actionProxy$.imitate(mergeSinks(allSinks, 'action'))
  nextConfigProxy$.imitate(mergeSinks(allSinks, 'nextConfig'))
  nextClipboardProxy$.imitate(mergeSinks(allSinks, 'nextClipboard'))
  nextDrawingItemProxy$.imitate(mergeSinks(allSinks, 'drawingItem'))
  nextEditingItemIdProxy$.imitate(mergeSinks(allSinks, 'nextEditingItemId'))
  nextModeProxy$.imitate(mergeSinks(allSinks, 'nextMode'))
  nextAdjustConfigs$.imitate(mergeSinks(allSinks, 'nextAdjustConfigs'))
  nextPolygonCloseIndicator$.imitate(mergeSinks(allSinks, 'nextPolygonCloseIndicator'))

  const save$ = mergeSinks(allSinks, 'SAVE')
  const file$ = mergeSinks(allSinks, 'FILE')

  mouse.imitate(svg.rawDown, svg.rawClick, svg.rawDblclick, svg.rawWheel)
  mouse.setAdjuster(makeAdjuster(keyboard, mouse, state$, adjustConfigs$, config$))
  UI.imitate(xs.merge(structure.intent, inspector.intent, menubar.intent, statusBar.intent))
  nextResizerProxy$.imitate(mergeSinks(allSinks, 'nextResizer'))
  nextVertexIndexProxy$.imitate(mergeSinks(allSinks, 'nextVertexIndex'))
  nextVertexInsertIndexProxy$.imitate(mergeSinks(allSinks, 'nextVertexInsertIndex'))

  const vdom$ = xs
    .combine(menubar.DOM, svg.DOM, structure.DOM, inspector.DOM, statusBar.DOM)
    .map(([menubar, svg, structure, inspector, statusBar]) =>
      h('div.app', [menubar, h('main', [structure, svg, inspector]), statusBar]),
    )

  return {
    DOM: vdom$,
    FILE: file$,
    SAVE: save$,
  }
}

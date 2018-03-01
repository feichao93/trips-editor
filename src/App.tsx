import { DOMSource, h, VNode } from '@cycle/dom'
import isolate from '@cycle/isolate'
import * as d3 from 'd3'
import { List, Set } from 'immutable'
import { identical } from 'ramda'
import xs, { MemoryStream, Stream } from 'xstream'
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
import serializeUtils from './utils/serializeUtils'
import testData from './testData'

export interface Sources {
  DOM: DOMSource
  FILE: Stream<FileStat>
  keyboard: KeyboardSource
  mouseup: Stream<MouseEvent>
  mousemove: Stream<MouseEvent>
  svgDOMRect: MemoryStream<DOMRect>
}

export interface Sinks {
  DOM: Stream<VNode>
  FILE: Stream<File | DialogRequest>
  SAVE: Stream<SaveConfig>
  svgDOMRect: Stream<any>
}

const initMode = 'idle'
const initConfig: AppConfig = require('./config.yaml')

export default function App(sources: Sources): Sinks {
  const domSource = sources.DOM
  const keyboard = sources.keyboard
  const svgDOMRect$ = sources.svgDOMRect

  const nextConfigProxy$ = xs.create<AppConfig>()
  const nextClipboardProxy$ = xs.create<Item>()
  const actionProxy$ = xs.create<Action>()
  const nextModeProxy$ = xs.create<string>()
  const nextWorkingProxies = {
    editing: xs.create<Set<ItemId>>(),
    drawing: xs.create<Item>(),
  }
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
        return h.undo()
      } else if (action === redo) {
        return h.redo()
      } else if (action === clearHistory) {
        return h.clearHistory()
      } else {
        return action.prepare(h).apply(action)
      }
    }, AppHistory.fromState(serializeUtils.fromJS(testData).set('transform', d3.zoomIdentity.scale(0.2))))
    .dropRepeats()
    .remember()

  const state$ = appHistory$
    .map(h => h.state)
    .dropRepeats()
    .remember()

  const adjustConfigs$ = nextAdjustConfigs$.startWith([])
  const working = {
    editing: nextWorkingProxies.editing.startWith(Set()),
    drawing: nextWorkingProxies.drawing.startWith(null),
  }
  const polygonCloseIndicator$ = nextPolygonCloseIndicator$.startWith(null)

  const mouse = new AdjustedMouse(
    svgDOMRect$,
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
    svgDOMRect: svgDOMRect$,
    UI,
    mouse,
    keyboard,
    config: config$,
    clipboard: clipboard$,
    mode: mode$,
    state: state$,
    adjustConfigs: adjustConfigs$,
    polygonCloseIndicator: polygonCloseIndicator$,
    working,
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
  nextWorkingProxies.editing.imitate(mergeSinks(allSinks, 'nextWorking.editing' as any))
  nextWorkingProxies.drawing.imitate(mergeSinks(allSinks, 'nextWorking.drawing' as any))
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
      h('div.app', [menubar, h('main', [/*structure,*/ svg, inspector]), statusBar]),
    )

  return {
    DOM: vdom$,
    FILE: file$,
    SAVE: save$,
    svgDOMRect: svg.svgDOMRectTrigger,
  }
}

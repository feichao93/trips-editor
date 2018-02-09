import { DOMSource, h, VNode } from '@cycle/dom'
import isolate from '@cycle/isolate'
import * as d3 from 'd3'
import xs, { Stream } from 'xstream'
import Inspector from './components/Inspector'
import Menubar from './components/Menubar'
import StatusBar from './components/StatusBar'
import Svg from './components/Svg'
import interactions from './interaction'
import { DialogRequest, FileStat } from './makeFileDriver'
import { KeyboardSource } from './makeKeyboardDriver'
import './styles/app.styl'
import AdjustedMouse from './utils/AdjustedMouse'
import { mergeSinks } from './utils/common'
import makeAdjuster from './utils/makeAdjuster'
import UIClass from './utils/UI'
import {
  Action,
  AdjustConfig,
  AppConfig,
  Item,
  SaveConfig,
  Sel,
  SelUpdater,
  State,
} from './interfaces'

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
  const nextResizerProxy$ = xs.create<string>()
  const nextVertexIndexProxy$ = xs.create<number>()
  const nextVertexInsertIndexProxy$ = xs.create<number>()
  const nextTransformProxy$ = xs.create<d3.ZoomTransform>()
  const nextAdjustConfigs$ = xs.create<AdjustConfig[]>()
  const nextPolygonCloseIndicator$ = xs.create<VNode>()

  const clipboard$ = nextClipboardProxy$.startWith(null)
  const config$ = nextConfigProxy$.startWith(initConfig)

  const stateAndSel$ = actionProxy$.fold(
    ({ state, sel }, action) => ({
      state: action.nextState(state, sel),
      sel: action.nextSel(state, sel),
    }),
    { state: new State(), sel: new Sel() },
  )
  const state$ = stateAndSel$
    .map(ss => ss.state)
    .dropRepeats()
    .remember()
  const sel$ = stateAndSel$
    .map(ss => ss.sel)
    .dropRepeats()
    .remember()
  const transform$ = nextTransformProxy$.startWith(d3.zoomIdentity)
  const mode$ = nextModeProxy$.startWith(initMode)
  const adjustConfigs$ = nextAdjustConfigs$.startWith([])
  const drawingItem$ = nextDrawingItemProxy$.startWith(null)
  const polygonCloseIndicator$ = nextPolygonCloseIndicator$.startWith(null)

  const UI = new UIClass()
  const mouse = new AdjustedMouse(
    transform$,
    sources.mousemove,
    sources.mouseup,
    nextResizerProxy$,
    nextVertexIndexProxy$,
    nextVertexInsertIndexProxy$,
  )

  const compSources = {
    FILE: sources.FILE,
    DOM: domSource,
    UI,
    mouse,
    keyboard,
    config: config$,
    clipboard: clipboard$,
    mode: mode$,
    state: state$,
    sel: sel$,
    transform: transform$,
    drawingItem: drawingItem$,
    adjustConfigs: adjustConfigs$,
    polygonCloseIndicator: polygonCloseIndicator$,
  }

  const menubar = isolate(Menubar, 'menubar')(compSources)
  const svg = isolate(Svg, 'svg')(compSources)
  const inspector = isolate(Inspector, 'inspector')(compSources)
  const statusBar = isolate(StatusBar, 'status-bar')(compSources)

  const interactionSinks = interactions.map(fn => fn(compSources))
  const allSinks = interactionSinks.concat([menubar, inspector, svg, statusBar])

  nextConfigProxy$.imitate(mergeSinks(allSinks, 'nextConfig'))
  nextClipboardProxy$.imitate(mergeSinks(allSinks, 'nextClipboard'))
  nextDrawingItemProxy$.imitate(mergeSinks(allSinks, 'drawingItem'))
  actionProxy$.imitate(mergeSinks(allSinks, 'action'))
  nextModeProxy$.imitate(mergeSinks(allSinks, 'nextMode'))
  nextTransformProxy$.imitate(mergeSinks(allSinks, 'nextTransform'))
  nextAdjustConfigs$.imitate(mergeSinks(allSinks, 'nextAdjustConfigs'))
  nextPolygonCloseIndicator$.imitate(mergeSinks(allSinks, 'nextPolygonCloseIndicator'))

  const save$ = mergeSinks(allSinks, 'SAVE')
  const file$ = mergeSinks(allSinks, 'FILE')

  mouse.imitate(svg.rawDown, svg.rawClick, svg.rawDblclick, svg.rawWheel)
  mouse.setAdjuster(makeAdjuster(keyboard, mouse, state$, transform$, adjustConfigs$, config$))
  UI.imitate(xs.merge(inspector.intent, menubar.intent, statusBar.intent))
  nextResizerProxy$.imitate(mergeSinks(allSinks, 'nextResizer'))
  nextVertexIndexProxy$.imitate(mergeSinks(allSinks, 'nextVertexIndex'))
  nextVertexInsertIndexProxy$.imitate(mergeSinks(allSinks, 'nextVertexInsertIndex'))

  const vdom$ = xs
    .combine(menubar.DOM, svg.DOM, inspector.DOM, statusBar.DOM)
    .map(([menubar, svg, inspector, statusBar]) =>
      h('div.app', [menubar, h('main', [svg, inspector]), statusBar]),
    )

  return {
    DOM: vdom$,
    FILE: file$,
    SAVE: save$,
  }
}

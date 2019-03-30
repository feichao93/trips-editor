import { DOMSource, h, VNode } from '@cycle/dom'
import isolate from '@cycle/isolate'
import { List } from 'immutable'
import xs, { Stream } from 'xstream'
import InspectorGeometricTab from './InspectorGeometricTab'
import InspectorHistoryTab from './InspectorHistoryTab'
import InspectorSemanticTab from './InspectorSemanticTab'
import { Action, AppConfig, AppHistory, State, UIIntent } from '../interfaces'
import { KeyboardSource } from '../makeKeyboardDriver'
import '../styles/inspector.styl'

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
  config: Stream<AppConfig>
  keyboard: KeyboardSource
  appHistory: Stream<AppHistory>
}

export interface Sinks {
  DOM: Stream<VNode>
  intent: Stream<UIIntent>
}

type TabName = 'geometric' | 'semantic' | 'history'
const allTabNames: TabName[] = ['geometric', 'semantic', 'history']

function TabChooserItem({ cntTabName, tabName }: { cntTabName: string; tabName: TabName }) {
  return h(
    'button.tab-chooser-item',
    {
      class: { active: cntTabName === tabName },
      dataset: { tab: tabName },
    },
    tabName,
  )
}

function TabChooser(cntTabName: TabName) {
  return h('div.tab-chooser', allTabNames.map(tabName => TabChooserItem({ cntTabName, tabName })))
}

export default function Inspector(sources: Sources): Sinks {
  const keyboard = sources.keyboard

  const nextTabName$ = xs.merge(
    sources.DOM.select('.tab-chooser-item')
      .events('click')
      .map(e => e.ownerTarget.dataset.tab as TabName),
    keyboard.shortcut('s').mapTo<TabName>('semantic'),
    keyboard.shortcut('g').mapTo<TabName>('geometric'),
    keyboard.shortcut('h').mapTo<TabName>('history'),
  )

  const tabName$ = nextTabName$
    .startWith('geometric')
    .dropRepeats()
    .remember()

  const tabWrapper$ = tabName$.map(tabName => {
    if (tabName === 'geometric') {
      return { inst: isolate(InspectorGeometricTab)(sources), tabName }
    } else if (tabName === 'history') {
      return { inst: isolate(InspectorHistoryTab)(sources), tabName }
    } else {
      return { inst: isolate(InspectorSemanticTab)(sources), tabName }
    }
  })

  const vdom$ = tabWrapper$
    .map(({ inst: { DOM: tabContent$ }, tabName }) =>
      tabContent$.map(tabContent =>
        h('div.inspector', [TabChooser(tabName), tabContent].filter(Boolean)),
      ),
    )
    .flatten()

  const intent$ = tabWrapper$.map(({ inst: { intent } }) => intent).flatten()

  return { DOM: vdom$, intent: intent$ }
}

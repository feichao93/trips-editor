import { DOMSource, h, VNode } from '@cycle/dom'
import { Stream } from 'xstream'
import InspectorGeometricTab from './InspectorGeometricTab'
import InspectorSemanticTab from './InspectorSemanticTab'
import { AppConfig, Sel, State, UIIntent } from '../interfaces'
import { KeyboardSource } from '../makeKeyboardDriver'
import '../styles/inspector.styl'

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
  sel: Stream<Sel>
  config: Stream<AppConfig>
  keyboard: KeyboardSource
}

export interface Sinks {
  DOM: Stream<VNode>
  intent: Stream<UIIntent>
}

// TODO working-style & config
type TabName = 'geometric' | 'semantic'
const allTabNames: TabName[] = ['geometric', 'semantic']

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
  const nextTabName$ = sources.DOM.select('.tab-chooser-item')
    .events('click')
    .map(e => e.ownerTarget.dataset.tab as TabName)

  const tabName$ = nextTabName$
    .startWith('geometric')
    .dropRepeats()
    .remember()

  const tabWrapper$ = tabName$.map(tabName => {
    if (tabName === 'geometric') {
      return { inst: InspectorGeometricTab(sources), tabName }
    } else {
      return { inst: InspectorSemanticTab(sources), tabName }
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

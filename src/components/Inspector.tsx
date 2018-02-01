import { DOMSource, h, VNode } from '@cycle/dom'
import xs, { Stream } from 'xstream'
import InspectorGeometricTab from './InspectorGeometricTab'
import InspectorSemanticTab from './InspectorSemanticTab'
import { Action, AppConfig, Sel, State } from '../interfaces'
import '../styles/inspector.styl'

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
  sel: Stream<Sel>
  config: Stream<AppConfig>
}

export interface Sinks {
  DOM: Stream<VNode>
  action: Stream<Action>
}

type InspectorTab = 'geometric' | 'semantic' // TODO working-style & config

function TabChooser(currentTab: InspectorTab) {
  return h('div.tab-chooser', [
    h(
      'button.tab-chooser-item',
      { class: { active: currentTab === 'geometric' }, dataset: { tab: 'geometric' } },
      'Geometric',
    ),
    h(
      'button.tab-chooser-item',
      { class: { active: currentTab === 'semantic' }, dataset: { tab: 'semantic' } },
      'Semantic',
    ),
  ])
}

export default function Inspector(sources: Sources): Sinks {
  const nextTab$ = sources.DOM.select('.tab-chooser-item')
    .events('click')
    .map(e => e.ownerTarget.dataset.tab as InspectorTab)

  const tab$ = nextTab$
    .startWith('geometric')
    .dropRepeats()
    .remember()

  const tabComponent$ = tab$.map(tab => {
    if (tab === 'geometric') {
      return { comp: InspectorGeometricTab(sources), tab }
    } else {
      return { comp: InspectorSemanticTab(sources), tab }
    }
  })

  const vdom$ = tabComponent$
    .map(({ comp: { DOM: tabContent$ }, tab }) =>
      tabContent$.map(tabContent =>
        h('div.inspector', [TabChooser(tab), tabContent].filter(Boolean)),
      ),
    )
    .flatten()

  const action$ = tabComponent$.map(({ comp: { action } }) => action).flatten()

  return { DOM: vdom$, action: action$ }
}

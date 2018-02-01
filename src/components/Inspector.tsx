import { DOMSource, h, VNode } from '@cycle/dom'
import xs, { Stream } from 'xstream'
import InspectorGeometricTab from './InspectorGeometricTab'
import InspectorSemanticTab from './InspectorSemanticTab'
import InspectorStylesTab from './InspectorStylesTab'
import { Action, AppConfig, Sel, State } from '../interfaces'
import '../styles/inspector.styl'

type UIIntent = null

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
  sel: Stream<Sel>
  config: Stream<AppConfig>
}

export interface Sinks {
  DOM: Stream<VNode>
  action: Stream<Action>
  intent?: Stream<UIIntent>
}

type InspectorTabName = 'geometric' | 'styles' | 'semantic' // TODO working-style & config

function TabChooserItem({
  currentTab,
  tabName,
}: {
  currentTab: string
  tabName: InspectorTabName
}) {
  return h(
    'button.tab-chooser-item',
    {
      class: { active: currentTab === tabName },
      dataset: { tab: tabName },
    },
    tabName,
  )
}

function TabChooser(currentTab: InspectorTabName) {
  return h('div.tab-chooser', [
    TabChooserItem({ currentTab, tabName: 'geometric' }),
    TabChooserItem({ currentTab, tabName: 'styles' }),
    TabChooserItem({ currentTab, tabName: 'semantic' }),
  ])
}

export default function Inspector(sources: Sources): Sinks {
  const nextTab$ = sources.DOM.select('.tab-chooser-item')
    .events('click')
    .map(e => e.ownerTarget.dataset.tab as InspectorTabName)

  const tab$ = nextTab$
    .startWith('geometric')
    .dropRepeats()
    .remember()

  const tabComponent$ = tab$.map(tab => {
    if (tab === 'geometric') {
      return { comp: InspectorGeometricTab(sources), tab }
    } else if (tab === 'styles') {
      return { comp: InspectorStylesTab(sources), tab }
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

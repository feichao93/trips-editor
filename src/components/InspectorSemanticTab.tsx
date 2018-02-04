import { DOMSource, h } from '@cycle/dom'
import { is } from 'immutable'
import { VNode } from 'snabbdom/vnode'
import xs, { Stream } from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import Checkbox from './common/Checkbox'
import { Sinks, Sources } from './Inspector'
import { Item, Sel, UIIntent } from '../interfaces'
import { isPolygonItem, isPolylineItem, round3 } from '../utils/common'

export default function InspectorSemanticTab({
  state: state$,
  sel: sel$,
  config: config$,
  DOM: domSource,
}: Sources): Sinks {
  const toggleSemanticLabelIntent$ = domSource
    .select('.label-list .checkbox')
    .events('click')
    .map<UIIntent.ToggleSemanticLabel>(e => ({
      type: 'toggle-semantic-label',
      label: e.ownerTarget.dataset.name,
    }))

  const labelsVdom$ = xs.combine(config$, state$, sel$).map(([config, state, sel]) => {
    const sitem = sel.item(state)
    if (sitem == null) {
      return h('p.empty-prompt', 'No Selected Items.')
    }
    return (
      <div className="label-list-wrapper">
        <p>
          Semantic Labels
          <button className="manage" disabled>
            Manage
          </button>
        </p>
        <ul className="label-list">
          {config.semantics.labels.map(label => (
            <li className="label" data-label={label}>
              <p className="name">{label}</p>
              <Checkbox name={label} checked={sitem.labels.has(label)} />
            </li>
          ))}
          <li className="label" />
        </ul>
      </div>
    )
  })

  const vdom$ = xs.combine(labelsVdom$).map(([labels]) => h('div.tab.semantic-tab', [labels]))

  return {
    DOM: vdom$,
    intent: toggleSemanticLabelIntent$,
  }
}

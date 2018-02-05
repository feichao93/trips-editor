import { h } from '@cycle/dom'
import xs from 'xstream'
import Checkbox from './common/Checkbox'
import { Sinks, Sources } from './Inspector'
import { UIIntent } from '../interfaces'

export default function InspectorSemanticTab({
  state: state$,
  sel: sel$,
  config: config$,
  DOM: domSource,
}: Sources): Sinks {
  const toggleSemanticTagIntent$ = domSource
    .select('.tag-list .checkbox')
    .events('click')
    .map<UIIntent.ToggleSemanticTag>(e => ({
      type: 'toggle-semantic-tag',
      tag: e.ownerTarget.dataset.name,
    }))

  const tagsVdom$ = xs.combine(config$, state$, sel$).map(([config, state, sel]) => {
    const sitem = sel.item(state)
    if (sitem == null) {
      return h('p.empty-prompt', 'No Selected Items.')
    }
    return (
      <div className="tag-list-wrapper">
        <p>
          Semantic Tags
          <button className="manage" disabled>
            Manage
          </button>
        </p>
        <ul className="tag-list">
          {config.semantics.tags.map(tag => (
            <li className="tag" data-tag={tag}>
              <p className="name">{tag}</p>
              <Checkbox name={tag} checked={sitem.tags.has(tag)} />
            </li>
          ))}
        </ul>
      </div>
    )
  })

  const vdom$ = xs.combine(tagsVdom$).map(([tags]) => h('div.tab.semantic-tab', [tags]))

  return {
    DOM: vdom$,
    intent: toggleSemanticTagIntent$,
  }
}

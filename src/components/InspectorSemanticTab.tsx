import { h } from '@cycle/dom'
import xs from 'xstream'
import Checkbox from './common/Checkbox'
import { Sinks, Sources } from './Inspector'
import { SemanticTagConfig, UIIntent } from '../interfaces'

function generateTagPreviewStyle({ styles }: SemanticTagConfig) {
  const result: any = {}
  if (styles.fill != null) {
    if (styles.fill === 'none') {
      result.border = '1px solid black'
    } else {
      result.background = styles.fill
    }
  } else {
    result.background = '#888888'
  }
  if (styles.stroke != null && styles.stroke != 'none') {
    result.border = `1px solid ${styles.stroke}`
  }
  return result
}

export default function InspectorSemanticTab({
  state: state$,
  sel: sel$,
  config: config$,
  DOM: domSource,
  keyboard,
}: Sources): Sinks {
  const toggleSemanticTagFromClickIntent$ = domSource
    .select('.tag-list .checkbox')
    .events('click')
    .map<UIIntent.ToggleSemanticTag>(e => ({
      type: 'toggle-semantic-tag',
      tagName: e.ownerTarget.dataset.name,
    }))

  const toggleSemanticTagFromShortcutIntent$ = config$
    .map(config =>
      xs.merge(
        ...config.semantics.tags.slice(0, 9).map((tag, index) =>
          keyboard.shortcut(String(index + 1)).mapTo<UIIntent.ToggleSemanticTag>({
            type: 'toggle-semantic-tag',
            tagName: tag.name,
          }),
        ),
      ),
    )
    .flatten()

  keyboard.shortcut

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
          {config.semantics.tags.map((tag, index) => (
            <li key={tag.name} className="tag" data-tag={tag.name}>
              <div className="preview" style={generateTagPreviewStyle(tag)} />
              <p className="name">
                {index + 1} {tag.name}
              </p>
              <Checkbox name={tag.name} checked={sitem.tags.has(tag.name)} />
            </li>
          ))}
        </ul>
      </div>
    )
  })

  const vdom$ = xs.combine(tagsVdom$).map(([tags]) => h('div.tab.semantic-tab', [tags]))

  return {
    DOM: vdom$,
    intent: xs.merge(toggleSemanticTagFromClickIntent$, toggleSemanticTagFromShortcutIntent$),
  }
}

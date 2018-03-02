import { h, VNode } from '@cycle/dom'
import xs from 'xstream'
import Checkbox from './common/Checkbox'
import { Sinks, Sources } from './Inspector'
import { SemanticTagConfig, UIIntent, State, AppConfig } from '../interfaces'
import { EditableField, Row } from './InspectorCommon'

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

function SemanticTagList(state: State, config: AppConfig) {
  const sitem = state.sitem()
  return (
    <div key="tag-list" className="tag-list-wrapper">
      <h2 style={{ 'margin-left': '10px' }}>
        Tags
        <button className="manage" disabled>
          Manage
        </button>
      </h2>
      <ul className="tag-list">
        {config.semantics.tags.map((tag, index) => (
          <li key={tag.name} className="tag" data-tag={tag.name}>
            <div className="preview" style={generateTagPreviewStyle(tag)} />
            <p className="name">
              {index + 1} {tag.name}
            </p>
            <Checkbox name={tag.name} checked={sitem.sem.tags.has(tag.name)} />
          </li>
        ))}
      </ul>
    </div>
  )
}

const SemanticLabel = {
  Label(state: State) {
    const sitem = state.sitem()
    return Row({ label: 'Label', key: 'semantic-label' }, [
      EditableField({
        field: 'sem.label',
        label: 'label',
        type: 'string',
        value: sitem.sem.label,
      }),
    ])
  },
  Position(state: State, config: AppConfig) {
    const sitem = state.sitem()
    return Row({ label: 'Position', key: 'label-position' }, [
      EditableField({ field: 'sem.dx', label: 'dx', type: 'number', value: sitem.sem.dx }),
      EditableField({ field: 'sem.dy', label: 'dy', type: 'number', value: sitem.sem.dy }),
    ])
  },
  FontSize(state: State, config: AppConfig) {
    const sitem = state.sitem()
    return Row({ label: 'Font Size', key: 'font-size' }, [
      EditableField({
        field: 'sem.fontSize',
        label: 'font size',
        type: 'number',
        value: sitem.sem.fontSize,
      }),
    ])
  },
}

export default function InspectorSemanticTab({
  state: state$,
  config: config$,
  DOM: domSource,
}: Sources): Sinks {
  const toggleSemanticTagFromClickIntent$ = domSource
    .select('.tag-list .checkbox')
    .events('click')
    .map<UIIntent.ToggleSemanticTag>(e => ({
      type: 'toggle-semantic-tag',
      tagName: e.ownerTarget.dataset.name,
    }))

  const editIntent$ = domSource
    .select('.field input')
    .events('input')
    .map<UIIntent.Edit>(e => {
      const input = e.ownerTarget as HTMLInputElement
      return { type: 'edit', field: input.dataset.field, value: input.value }
    })

  const vdom$ = xs.combine(state$, config$).map(([state, config]) => {
    let children: VNode[] = []
    const sitem = state.sitem()
    if (sitem == null) {
      children = [h('p.empty-prompt', { key: 'empty-prompt' }, 'No Selected Items.')]
    } else {
      children = [
        SemanticLabel.Label(state),
        SemanticLabel.Position(state, config),
        SemanticLabel.FontSize(state, config),
        SemanticTagList(state, config),
      ]
    }
    return h('div.tab.semantic-tab', children)
  })

  return {
    DOM: vdom$,
    intent: xs.merge(editIntent$, toggleSemanticTagFromClickIntent$),
  }
}

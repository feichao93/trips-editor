import { h } from '@cycle/dom'
import xs from 'xstream'
import { Sinks, Sources } from './Inspector'
import { StylePreset, UIIntent } from '../interfaces'

function generatePreview({ styles }: StylePreset) {
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
  if (styles.opacity != null) {
    result.opacity = styles.opacity
  }
  return result
}

export default function InspectorStylesTab({
  DOM: domSource,
  sel: sel$,
  config: config$,
  state: state$,
}: Sources): Sinks {
  const intent$ = domSource
    .select('.preset .apply')
    .events('click')
    .map<UIIntent.ApplyStylePreset>(e => ({
      type: 'apply-style-preset',
      name: e.ownerTarget.parentElement.dataset.stylePreset,
    }))

  const sitem$ = xs.combine(state$, sel$).map(([state, sel]) => sel.item(state))

  const stylePresetVdom$ = xs.combine(sitem$, config$).map(([sitem, config]) => (
    <div className="preset-list-wrapper">
      <p>
        Style Presets
        <button className="manage" disabled>
          manage
        </button>
      </p>
      <ul className="preset-list">
        {config.stylePresets.map(preset => (
          <li className="preset" data-stylePreset={preset.name}>
            <div className="preview" style={generatePreview(preset)} />
            <p className="name">{preset.name}</p>
            <button className="apply">Apply</button>
          </li>
        ))}
      </ul>
    </div>
  ))

  const vdom$ = xs
    .combine(stylePresetVdom$)
    .map(([stylePresets]) => h('div.tab.styles-tab', [stylePresets]))

  return {
    DOM: vdom$,
    intent: intent$,
  }
}

import { DOMSource, h } from '@cycle/dom'
import { is } from 'immutable'
import { VNode } from 'snabbdom/vnode'
import xs, { Stream } from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import { Sinks, Sources } from './Inspector'
import actions, { Action, State, ZIndexOp } from '../actions'
import { Item, Sel } from '../interfaces'
import { isPolygonItem, isPolylineItem, round3 } from '../utils/common'

export default function InspectorStylesTab({
  DOM: domSource,
  sel: sel$,
  config: config$,
  state: state$,
}: Sources): Sinks {
  const applyStylePresetIntent$ = domSource
    .select('.preset .apply')
    .events('click')
    .map(e => e.ownerTarget.parentElement.dataset.stylePreset)

  const action$ = applyStylePresetIntent$
    .whenNot(sel$, sel => sel.isEmpty())
    .sampleCombine(sel$, config$)
    .map(([presetName, sel, config]) => {
      const preset = config.stylePresets.find(preset => preset.name === presetName)
      return actions.applyStyles(sel, preset.styles)
    })

  const sitem$ = xs.combine(state$, sel$).map(([state, sel]) => sel.item(state))

  const stylePresetVdom$ = xs.combine(sitem$, config$).map(([sitem, config]) => (
    <div className="preset-list-wrapper">
      <p>
        Style Presets
        <button disabled>manage</button>
      </p>
      <ul className="preset-list">
        {config.stylePresets.map(preset => (
          <li className="preset" data-stylePreset={preset.name}>
            <p className="name">{preset.name}</p>
            <button className="apply">Apply</button>
            <button style={{ marginLeft: '8px' }}>Remove</button>
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
    action: action$,
  }
}

import { DOMSource, h } from '@cycle/dom'
import { is } from 'immutable'
import { VNode } from 'snabbdom/vnode'
import xs, { Stream } from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import { Sinks, Sources } from './Inspector'
import actions, { Action, State, ZIndexOp } from '../actions'
import { Item, Sel } from '../interfaces'
import { isPolygonItem, isPolylineItem, round3 } from '../utils/common'

export default function InspectorGeometricTab(sources: Sources): Sinks {
  const toggleTag$ = sources.DOM.select('.tag input')
    .events('change')
    .map(e => e.ownerTarget.dataset.tag)
    .sampleCombine(sources.sel)
    .map(actions.toggleTag)

  const config$ = sources.config
  const sitem$ = xs.combine(sources.state, sources.sel).map(([state, sel]) => sel.item(state))

  const vdom$ = xs.combine(sitem$, config$).map(
    ([sitem, config]) =>
      sitem ? (
        <div className="tab semantic-tab">
          <div className="tag-list-wrapper">
            <p>Tag List</p>
            <ul className="tag-list">
              {config.tags.map(tag => (
                <li className="tag">
                  <label>
                    <span>{tag.name}</span>
                    <input
                      type="checkbox"
                      data-tag={tag.name}
                      checked={sitem.semantics.tags.includes(tag.name)}
                    />
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null,
  )

  return {
    DOM: vdom$,
    action: toggleTag$,
  }
}

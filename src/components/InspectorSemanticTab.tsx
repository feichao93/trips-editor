import { DOMSource, h } from '@cycle/dom'
import { is } from 'immutable'
import { VNode } from 'snabbdom/vnode'
import xs, { Stream } from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import { Sinks, Sources } from './Inspector'
import actions, { Action, State, ZIndexOp } from '../actions'
import { Item, Sel } from '../interfaces'
import { isPolygonItem, isPolylineItem, round3 } from '../utils/common'

export default function InspectorSemanticTab(sources: Sources): Sinks {
  const vdom$ = xs.of(h('div.tab.semantic-tab', [h('h1', 'This tab is WIP')]))

  return { DOM: vdom$, action: xs.never() }
}

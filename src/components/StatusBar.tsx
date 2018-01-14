import { h, DOMSource, VNode } from '@cycle/dom'
import xs, { Stream } from 'xstream'
import { State } from '../actions'
import '../styles/StatusBar.styl'

export interface Sources {
  DOM: DOMSource
  mode: Stream<string>
  state: Stream<State>
}

export interface Sinks {
  DOM: Stream<VNode>
}

export default function StatusBar(source: Sources): Sinks {
  const mode$ = source.mode
  const vdom$ = xs.combine(mode$).map(([mode]) => h('div.status-bar', [h('p', mode)]))
  return { DOM: vdom$ }
}

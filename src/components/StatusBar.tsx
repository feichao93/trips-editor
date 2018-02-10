import { DOMSource, h, VNode } from '@cycle/dom'
import * as d3 from 'd3'
import xs, { Stream } from 'xstream'
import { State, UIIntent } from '../interfaces'
import '../styles/StatusBar.styl'

export interface Sources {
  DOM: DOMSource
  mode: Stream<string>
  state: Stream<State>
}

export interface Sinks {
  DOM: Stream<VNode>
  intent: Stream<UIIntent>
}

export default function StatusBar({ DOM: domSource, mode: mode$, state: state$ }: Sources): Sinks {
  const resetZoomIntent$ = domSource
    .select('.reset-zoom')
    .events('click')
    .mapTo<UIIntent>('reset-zoom')

  const toggleSelnModeIntent$ = domSource
    .select('.toggle-sel-mode')
    .events('click')
    .mapTo<UIIntent>('toggle-sel-mode')

  const vdom$ = xs
    .combine(mode$, state$)
    .map(([mode, state]) =>
      h('div.status-bar', [
        h('div.left', [
          h('p.item.mode', mode),
          h(
            'p.button.toggle-sel-mode',
            { attrs: { title: 'Toggle Selection Mode' } },
            state.selMode,
          ),
        ]),
        h('div.right', [
          h(
            'p.button.reset-zoom',
            { attrs: { title: 'Click to Reset Zoom' } },
            `${Math.round(state.transform.k * 100)}%`,
          ),
        ]),
      ]),
    )

  return {
    DOM: vdom$,
    intent: xs.merge(resetZoomIntent$, toggleSelnModeIntent$),
  }
}

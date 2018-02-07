import { DOMSource, h, VNode } from '@cycle/dom'
import * as d3 from 'd3'
import xs, { Stream } from 'xstream'
import { Sel, State, UIIntent } from '../interfaces'
import '../styles/StatusBar.styl'

export interface Sources {
  DOM: DOMSource
  mode: Stream<string>
  transform: Stream<d3.ZoomTransform>
  state: Stream<State>
  sel: Stream<Sel>
}

export interface Sinks {
  DOM: Stream<VNode>
  intent: Stream<UIIntent>
}

export default function StatusBar({
  DOM: domSource,
  mode: mode$,
  transform: transform$,
  sel: sel$,
}: Sources): Sinks {
  const resetZoomIntent$ = domSource
    .select('.reset-zoom')
    .events('click')
    .mapTo<UIIntent>('reset-zoom')

  const toggleSelnModeIntent$ = domSource
    .select('.toggle-sel-mode')
    .events('click')
    .mapTo<UIIntent>('toggle-sel-mode')

  const vdom$ = xs
    .combine(mode$, transform$, sel$)
    .map(([mode, transform, sel]) =>
      h('div.status-bar', [
        h('div.left', [
          h('p.item.mode', mode),
          h('p.button.toggle-sel-mode', { attrs: { title: 'Toggle Selection Mode' } }, sel.mode),
        ]),
        h('div.right', [
          h(
            'p.button.reset-zoom',
            { attrs: { title: 'Click to Reset Zoom' } },
            `${Math.round(transform.k * 100)}%`,
          ),
        ]),
      ]),
    )

  return {
    DOM: vdom$,
    intent: xs.merge(resetZoomIntent$, toggleSelnModeIntent$),
  }
}

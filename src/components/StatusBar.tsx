import { DOMSource, h, VNode } from '@cycle/dom'
import * as d3 from 'd3'
import xs, { Stream } from 'xstream'
import { State, UIIntent } from '../interfaces'
import '../styles/StatusBar.styl'

export interface Sources {
  DOM: DOMSource
  mode: Stream<string>
  transform: Stream<d3.ZoomTransform>
  state: Stream<State>
}

export interface Sinks {
  DOM: Stream<VNode>
  intent: Stream<UIIntent>
}

export default function StatusBar(sources: Sources): Sinks {
  const domSource = sources.DOM

  const resetZoomIntent$ = domSource
    .select('.reset-zoom')
    .events('click')
    .mapTo<UIIntent>('reset-zoom')

  const vdom$ = xs
    .combine(sources.mode, sources.transform)
    .map(([mode, transform]) =>
      h('div.status-bar', [
        h('div.left', [h('p.mode', mode)]),
        h('div.right', [
          h(
            'p.reset-zoom.button',
            { attrs: { title: 'Click to Reset Zoom' } },
            `${Math.round(transform.k * 100)}%`,
          ),
        ]),
      ]),
    )

  return {
    DOM: vdom$,
    intent: resetZoomIntent$,
  }
}

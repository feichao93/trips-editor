import { DOMSource, h, VNode } from '@cycle/dom'
import * as d3 from 'd3'
import xs, { Stream } from 'xstream'
import { State } from '../actions'
import '../styles/StatusBar.styl'
import transition from '../utils/transition'

export interface Sources {
  DOM: DOMSource
  mode: Stream<string>
  transform: Stream<d3.ZoomTransform>
  state: Stream<State>
}

export interface Sinks {
  DOM: Stream<VNode>
  nextTransform: Stream<d3.ZoomTransform>
}

export default function StatusBar(sources: Sources): Sinks {
  const domSource = sources.DOM

  const nextTransform$ = domSource
    .select('p.transform')
    .events('click')
    .peek(sources.transform)
    .map(cnt => transition(250, [cnt.x, cnt.y, cnt.k], [0, 0, 1]))
    .flatten()
    .map(([x, y, k]) => d3.zoomIdentity.translate(x, y).scale(k)) // TODO use d3.interpolateZoom

  const vdom$ = xs
    .combine(sources.mode, sources.transform)
    .map(([mode, transform]) =>
      h('div.status-bar', [
        h('div.left', [h('p.mode', mode)]),
        h('div.right', [
          h(
            'p.transform.button',
            { attrs: { title: 'Click to Reset Transform' } },
            `${Math.round(transform.k * 100)}%`,
          ),
        ]),
      ]),
    )

  return {
    DOM: vdom$,
    nextTransform: nextTransform$,
  }
}

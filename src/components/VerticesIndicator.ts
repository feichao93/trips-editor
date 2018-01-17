import { DOMSource, h, VNode } from '@cycle/dom'
import xs, { Stream } from 'xstream'
import { State } from '../actions'
import { INDICATOR_CIRCLE_RADIUS } from '../constants'
import { Point, Selection } from '../interfaces'
import { distanceBetweenPointAndPoint } from '../utils/common'

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
  selection: Stream<Selection>
  transform: Stream<d3.ZoomTransform>
}

export interface Sinks {
  DOM: Stream<VNode>
  whichVertex: Stream<(p: Point) => number>
}

export default function VerticesIndicator({
  selection: sel$,
  transform: transform$,
  state: state$,
}: Sources): Sinks {
  const vertices$ = xs.combine(sel$, state$).map(([sel, state]) => sel.vertices(state))
  const whichVertex$ = vertices$
    .sampleCombine(transform$)
    .map(([vertices, transform]) => (p: Point) =>
      vertices.findIndex(
        v => distanceBetweenPointAndPoint(v, p) <= INDICATOR_CIRCLE_RADIUS / transform.k,
      ),
    )
  const vdom$ = xs.combine(vertices$, transform$, sel$).map(([vertices, transform, sel]) =>
    h(
      'g.vertices-indicator',
      { key: 'vertices-indicator' },
      vertices.toArray().map((p, i) =>
        h('circle.vertex', {
          attrs: {
            cx: p.x,
            cy: p.y,
            r: INDICATOR_CIRCLE_RADIUS / transform.k,
            'fill-opacity': 0.5,
            fill: i === sel.svi ? 'red' : 'white',
            stroke: 'black',
            'stroke-width': 2 / transform.k,
          },
          dataset: { pointIndex: String(i) },
        }),
      ),
    ),
  )

  return {
    DOM: vdom$,
    whichVertex: whichVertex$,
  }
}

import { DOMSource, h, VNode } from '@cycle/dom'
import xs, { Stream } from 'xstream'
import { State } from '../actions'
import { INDICATOR_CIRCLE_RADIUS } from '../constants'
import { Point, Sel } from '../interfaces'
import { distanceBetweenPointAndPoint } from '../utils/common'
import Mouse from '../utils/Mouse'

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
  mouse: Mouse
  sel: Stream<Sel>
  transform: Stream<d3.ZoomTransform>
}

export interface Sinks {
  DOM: Stream<VNode>
  nextVertexIndex: Stream<number>
}

export default function VerticesIndicator({
  sel: sel$,
  mouse,
  transform: transform$,
  state: state$,
}: Sources): Sinks {
  const vertices$ = xs.combine(sel$, state$).map(([sel, state]) => sel.vertices(state))
  const nextVertexIndex$ = xs
    .combine(vertices$, mouse.move$, transform$)
    .whenNot(mouse.pressing$)
    .map(([vertices, p, transform]) =>
      vertices.findIndex(
        v => distanceBetweenPointAndPoint(v, p) <= INDICATOR_CIRCLE_RADIUS / transform.k,
      ),
    )
  const vdom$ = xs
    .combine(vertices$, transform$, mouse.vertexIndex$)
    .map(([vertices, transform, vertexIndex]) =>
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
              fill: i === vertexIndex ? 'red' : 'white',
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
    nextVertexIndex: nextVertexIndex$,
  }
}

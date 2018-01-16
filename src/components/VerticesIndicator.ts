import { DOMSource, h, VNode } from '@cycle/dom'
import xs, { Stream } from 'xstream'
import { State } from '../actions'
import { INDICATOR_CIRCLE_RADIUS } from '../constants'
import { Selection } from '../interfaces'

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
  selection: Stream<Selection>
  transform: Stream<d3.ZoomTransform>
}

export interface Sinks {
  DOM: Stream<VNode>
  vertexIndex: Stream<number>
}

export default function VerticesIndicator({
  DOM: domSource,
  selection: selection$,
  transform: transform$,
  state: state$,
}: Sources): Sinks {
  const verticesSource = domSource.select('.vertex')
  const enter$ = verticesSource
    .events('mouseover')
    .map(e => Number((e.ownerTarget as HTMLElement).dataset.pointIndex))
  const exit$ = verticesSource.events('mouseout').mapTo(-1)
  const vertexIndex$ = xs.merge(enter$, exit$)

  const vertices$ = xs.combine(selection$, state$).map(([sel, state]) => sel.vertices(state))
  const vdom$ = xs
    .combine(vertices$, transform$, vertexIndex$.startWith(-1))
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

  return { DOM: vdom$, vertexIndex: vertexIndex$ }
}

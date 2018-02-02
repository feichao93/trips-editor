import { DOMSource, h, VNode } from '@cycle/dom'
import xs, { Stream } from 'xstream'
import { SmallCircle, SmallCross } from './SelectionIndicator'
import { INDICATOR_CIRCLE_RADIUS } from '../constants'
import { Sel, State } from '../interfaces'
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
  const verticesAndEditable$ = xs.combine(sel$, state$).map(([sel, state]) => {
    const item = sel.item(state)
    const vertices = sel.vertices(state)
    const editable = item && !item.locked
    return { editable, vertices }
  })
  const nextVertexIndex$ = xs
    .combine(verticesAndEditable$, mouse.move$, transform$)
    .whenNot(mouse.pressing$)
    .map(
      ([{ editable, vertices }, p, transform]) =>
        editable
          ? vertices.findIndex(
              v => distanceBetweenPointAndPoint(v, p) <= INDICATOR_CIRCLE_RADIUS / transform.k,
            )
          : -1,
    )
  const vdom$ = xs
    .combine(verticesAndEditable$, transform$, mouse.vertexIndex$)
    .map(([{ vertices, editable }, transform, vertexIndex]) => {
      const Shape = editable ? SmallCircle : SmallCross
      return h(
        'g.vertices-indicator',
        { key: 'vertices-indicator' },
        vertices.toArray().map((p, i) =>
          Shape({
            x: p.x,
            y: p.y,
            k: transform.k,
            dataset: { pointIndex: String(i) },
            attrs: {
              fill: i === vertexIndex ? 'red' : 'white',
              className: 'vertex',
            },
          }),
        ),
      )
    })

  return {
    DOM: vdom$,
    nextVertexIndex: nextVertexIndex$,
  }
}

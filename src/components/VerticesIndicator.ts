import { DOMSource, h, VNode } from '@cycle/dom'
import xs, { Stream } from 'xstream'
import { SmallCircle, SmallCross } from './SelectionIndicator'
import { INDICATOR_CIRCLE_RADIUS } from '../constants'
import { State } from '../interfaces'
import { distanceBetweenPointAndPoint } from '../utils/common'
import Mouse from '../utils/Mouse'

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
  mouse: Mouse
}

export interface Sinks {
  DOM: Stream<VNode>
  nextVertexIndex: Stream<number>
}

export default function VerticesIndicator({ mouse, state: state$ }: Sources): Sinks {
  const verticesAndEditable$ = state$.map(state => {
    const item = state.sitem()
    const vertices = state.vertices()
    const editable = item && !item.locked
    return { editable, vertices }
  })
  const nextVertexIndex$ = xs
    .combine(state$, verticesAndEditable$, mouse.move$)
    .whenNot(mouse.pressing$)
    .map(
      ([{ transform }, { editable, vertices }, p]) =>
        editable
          ? vertices.findIndex(
              v => distanceBetweenPointAndPoint(v, p) <= INDICATOR_CIRCLE_RADIUS / transform.k,
            )
          : -1,
    )
  const vdom$ = xs
    .combine(state$, verticesAndEditable$, mouse.vertexIndex$)
    .map(([{ transform }, { vertices, editable }, vertexIndex]) => {
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

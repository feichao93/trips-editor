import { DOMSource, h, VNode } from '@cycle/dom'
import { List } from 'immutable'
import xs, { Stream } from 'xstream'
import { State } from '../actions'
import { INDICATOR_CIRCLE_RADIUS, SENSE_RANGE } from '../constants'
import { Point, Selection } from '../interfaces'
import { distanceBetweenPointAndPoint, distanceBetweenPointAndSegment } from '../utils/common'
import Mouse from '../utils/Mouse'

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
  mouse: Mouse
  selection: Stream<Selection>
  transform: Stream<d3.ZoomTransform>
}

export interface Sinks {
  DOM: Stream<VNode>
  vertexAddIndex: Stream<number>
}

export default function VertexAddIndicator({
  selection: sel$,
  mouse,
  transform: transform$,
  state: state$,
}: Sources): Sinks {
  const vertices$ = xs.combine(sel$, state$).map(([sel, state]) => sel.vertices(state))
  const segments$ = xs.combine(mouse.vertexIndex$, vertices$).map(
    ([vertexIndex, vs]) =>
      vertexIndex !== -1 || vs.isEmpty()
        ? List<[Point, Point]>()
        : vs
            .butLast()
            .zip(vs.rest())
            .push([vs.last(), vs.first()]),
  )
  const segIndex$ = xs
    .combine(mouse.move$, segments$, transform$)
    .map(([pos, segments, transform]) =>
      segments.findIndex(
        seg => distanceBetweenPointAndSegment(pos, seg[0], seg[1]) <= SENSE_RANGE / transform.k,
      ),
    )
  const segs$ = segIndex$
    .sampleCombine(segments$)
    .map(([i, segs]) => (i === -1 ? null : segs.get(i)))
  const vdom$ = segs$.map(
    seg =>
      seg
        ? h('line', {
            attrs: {
              x1: seg[0].x,
              y1: seg[0].y,
              x2: seg[1].x,
              y2: seg[1].y,
              stroke: 'red',
              'stroke-width': 5,
            },
          })
        : null,
  )

  return { DOM: vdom$, vertexAddIndex: segIndex$ }
}

import { DOMSource, h, VNode } from '@cycle/dom'
import { List } from 'immutable'
import xs, { Stream } from 'xstream'
import { State } from '../actions'
import { SENSE_RANGE } from '../constants'
import { Point, Selection } from '../interfaces'
import { ShortcutSource } from '../makeShortcutDriver'
import { distanceBetweenPointAndSegment } from '../utils/common'
import Mouse from '../utils/Mouse'

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
  mouse: Mouse
  shortcut: ShortcutSource
  selection: Stream<Selection>
  transform: Stream<d3.ZoomTransform>
}

export interface Sinks {
  DOM: Stream<VNode>
  nextVertexInsertIndex: Stream<number>
}

export default function VertexInsertIndicator({
  selection: sel$,
  mouse,
  shortcut,
  transform: transform$,
  state: state$,
}: Sources): Sinks {
  const vertices$ = xs.combine(sel$, state$).map(([sel, state]) => sel.vertices(state))
  const segments$ = vertices$.map(
    vs =>
      vs.isEmpty()
        ? List<[Point, Point]>()
        : vs
            .butLast()
            .zip(vs.rest())
            .push([vs.last(), vs.first()]),
  )
  const highlightedSegmentIndex$ = xs
    .combine(mouse.move$, segments$, transform$, mouse.vertexIndex$)
    .map(
      ([pos, segments, transform, vertexIndex]) =>
        vertexIndex === -1
          ? segments.findIndex(
              seg =>
                distanceBetweenPointAndSegment(pos, seg[0], seg[1]) <= SENSE_RANGE / transform.k,
            )
          : -1,
    )
  const highlightedSegment$ = highlightedSegmentIndex$
    .sampleCombine(segments$)
    .map(([i, segs]) => (i === -1 ? null : segs.get(i)))
  const vdom$ = highlightedSegment$.map(
    seg =>
      seg
        ? h('line', {
            attrs: {
              x1: seg[0].x,
              y1: seg[0].y,
              x2: seg[1].x,
              y2: seg[1].y,
              stroke: '#14e01c',
              'stroke-width': 5,
            },
          })
        : null,
  )

  return {
    DOM: vdom$,
    nextVertexInsertIndex: highlightedSegmentIndex$.map(
      segIndex => (segIndex === -1 ? -1 : segIndex + 1),
    ),
  }
}

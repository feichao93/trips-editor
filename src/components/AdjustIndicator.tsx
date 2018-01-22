import { DOMSource, h, VNode } from '@cycle/dom'
import xs, { Stream } from 'xstream'
import { State } from '../actions'
import { AdjustConfig } from '../interfaces'
import { SENSE_RANGE } from '../constants'
import AdjustedMouse from '../utils/AdjustMouse'

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
  transform: Stream<d3.ZoomTransform>
  mouse: AdjustedMouse
  adjustConfigs: Stream<AdjustConfig[]>
}

export interface Sinks {
  DOM: Stream<VNode>
}

export default function AdjustIndicator(sources: Sources): Sinks {
  const vdom$ = xs
    .combine(sources.mouse.adjustedMoveInfo$, sources.transform)
    .map(([adjustResult, transform]) => {
      if (adjustResult == null) {
        return null
      }
      const cementPointView = adjustResult.applied.includes('cement')
        ? h('circle', {
            key: 'adjust-cement',
            attrs: {
              cx: adjustResult.point.x,
              cy: adjustResult.point.y,
              r: SENSE_RANGE / transform.k,
              fill: 'red',
              'fill-opacity': 0.4,
            },
          })
        : null

      return h('g.adjust-indicator', [cementPointView].filter(Boolean))
    })

  return {
    DOM: vdom$,
  }
}

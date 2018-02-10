import * as d3 from 'd3'
import { clamp, identical } from 'ramda'
import xs from 'xstream'
import SetTransformAction from '../actions/SetTransformAction'
import { Component } from '../interfaces'
import transition from '../utils/transition'

// TODO use d3.interpolateZoom instead of d3.interpolate

const zoom: Component = ({ mouse, config: config$, mode: mode$, state: state$, UI }) => {
  const dragStart$ = mouse.rawDown$
    .when(mode$, identical('idle'))
    .whenNot(mouse.isBusy$)
    .sampleCombine(state$)
    .map(([rawPos, state]) => {
      const pos = state.transform.invertPos(rawPos)
      const clickedItems = state.items.filter(item => item.containsPoint(pos))
      if (clickedItems.every(item => item.locked)) {
        return { rawPos, transform: state.transform }
      }
      return null
    })
    .filter(Boolean)

  const drag$ = dragStart$
    .map(dragStart =>
      mouse.rawMove$
        .map(rawPos => {
          const k = dragStart.transform.k
          const dx = rawPos.x - dragStart.rawPos.x
          const dy = rawPos.y - dragStart.rawPos.y
          const target = dragStart.transform.translate(dx / k, dy / k)
          return new SetTransformAction(target, dragStart.transform)
        })
        .endWhen(mouse.up$),
    )
    .flatten()

  const zoomFromDblclick$ = mouse.rawDblclick$.map(pos => ({ pos, delta: 2, useTransition: true }))
  const zoomFromWheel$ = mouse.rawWheel$.map(({ pos, deltaY }) => ({
    pos,
    delta: 0.95 ** (deltaY / 100),
    useTransition: false,
  }))
  const zoom$ = xs
    .merge(zoomFromDblclick$, zoomFromWheel$)
    .sampleCombine(state$, config$)
    .map(([{ pos: rawPos, delta, useTransition }, state, config]) => {
      const { x, y, k } = state.transform
      const nextK = clamp(config.minScale, config.maxScale, k * delta)
      const factor = nextK / k // 实际的放大率
      const nextX = factor * (x - rawPos.x) + rawPos.x
      const nextY = factor * (y - rawPos.y) + rawPos.y
      if (useTransition && factor !== 1) {
        return transition(250, [x, y, k], [nextX, nextY, nextK]).map(([x, y, k]) => ({
          start: state.transform,
          target: d3.zoomIdentity.translate(x, y).scale(k),
        }))
      } else {
        return xs.of({
          start: state.transform,
          target: d3.zoomIdentity.translate(nextX, nextY).scale(nextK),
        })
      }
    })
    .flatten()
    .map(({ start, target }) => new SetTransformAction(target, start))

  const resetZoom$ = UI.intent('reset-zoom')
    .peek(state$)
    .map(({ transform: start }) =>
      transition(250, [start.x, start.y, start.k], [0, 0, 1]).map(([x, y, k]) => ({
        start,
        target: d3.zoomIdentity.translate(x, y).scale(k),
      })),
    )
    .flatten()
    .map(({ start, target }) => new SetTransformAction(target, start))

  return {
    action: xs.merge(zoom$, drag$, resetZoom$),
  }
}

export default zoom

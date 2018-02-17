import * as d3 from 'd3'
import { clamp, identical } from 'ramda'
import xs from 'xstream'
import SetTransformAction from '../actions/SetTransformAction'
import { Component, UIIntent, Rect } from '../interfaces'
import transition from '../utils/transition'
import { getBoundingBoxOfPoints } from '../utils/common'

function transformToZoomView(
  viewBox: DOMRect,
  { x, y, k }: { x: number; y: number; k: number },
): d3.ZoomView {
  const size = Math.min(viewBox.width, viewBox.height) / k
  const cx = (viewBox.width / 2 - x) / k
  const cy = (viewBox.height / 2 - y) / k
  return [cx, cy, size]
}

function zoomViewToTransform(viewBox: DOMRect, [cx, cy, size]: d3.ZoomView) {
  const k = Math.min(viewBox.width, viewBox.height) / size
  const x = viewBox.width / 2 - cx * k
  const y = viewBox.height / 2 - cy * k
  return d3.zoomIdentity.translate(x, y).scale(k)
}

function interpolateTransform(viewBox: DOMRect) {
  return (startTransform: d3.ZoomTransform, targetTransform: d3.ZoomTransform) => {
    const inp = d3.interpolateZoom(
      transformToZoomView(viewBox, startTransform),
      transformToZoomView(viewBox, targetTransform),
    )
    return (t: number) => zoomViewToTransform(viewBox, inp(t))
  }
}

function getProperTransform(viewBox: DOMRect, rect: Rect) {
  const k = Math.min(viewBox.width / rect.width, viewBox.height / rect.height) / 2
  const x = viewBox.width / 2 - k * (rect.x + rect.width / 2)
  const y = viewBox.height / 2 - k * (rect.y + rect.height / 2)
  return d3.zoomIdentity.translate(x, y).scale(k)
}

const zoom: Component = ({
  mouse,
  config: config$,
  mode: mode$,
  state: state$,
  UI,
  svgDOMRect: svgDOMRect$,
}) => {
  const dragStart$ = mouse.rawDown$
    .when(mode$, identical('idle'))
    .whenNot(mouse.isBusy$)
    .sampleCombine(state$, config$)
    .map(([rawPos, state, config]) => {
      const pos = state.transform.invertPos(rawPos)
      const clickedItems = state.items.filter(item => item.containsPoint(pos))
      if (clickedItems.every(item => item.locked)) {
        return { rawPos, transform: state.transform, senseRange: config.senseRange }
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
          return new SetTransformAction(target, dragStart.transform, null, dragStart.senseRange)
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
    .sampleCombine(state$, config$, svgDOMRect$)
    .map(
      ([{ pos: rawPos, delta, useTransition }, { transform: startTransform }, config, viewBox]) => {
        const { x, y, k } = startTransform
        const nextK = clamp(config.minScale, config.maxScale, k * delta)
        const factor = nextK / k // 实际的放大率
        const nextX = factor * (x - rawPos.x) + rawPos.x
        const nextY = factor * (y - rawPos.y) + rawPos.y
        const targetTransform = d3.zoomIdentity.translate(nextX, nextY).scale(nextK)

        const action = (transform: d3.ZoomTransform) =>
          new SetTransformAction(transform, startTransform, rawPos, config.senseRange)

        if (useTransition && factor !== 1) {
          return transition(
            250,
            startTransform,
            targetTransform,
            interpolateTransform(viewBox),
          ).map(action)
        } else {
          return xs.of(action(targetTransform))
        }
      },
    )
    .flatten()

  const zoomToItem$ = UI.intent<UIIntent.ZoomToItem>('zoom-to-item')
    .sampleCombine(state$, svgDOMRect$)
    .map(([{ itemId }, state, viewBox]) => {
      const item = state.items.get(itemId)
      const bbox = getBoundingBoxOfPoints(item.getVertices())
      return getProperTransform(viewBox, bbox)
    })
    .sampleCombine(state$, config$, svgDOMRect$)
    .map(([targetTransform, { transform: startTransform }, config, viewBox]) =>
      transition(250, startTransform, targetTransform, interpolateTransform(viewBox)).map(
        nextTransform =>
          new SetTransformAction(nextTransform, startTransform, null, config.senseRange),
      ),
    )
    .flatten()

  const resetZoom$ = UI.intent('reset-zoom')
    .peek(xs.combine(state$, config$, svgDOMRect$))
    .map(([{ transform: startTransform }, config, viewBox]) =>
      transition(250, startTransform, d3.zoomIdentity, interpolateTransform(viewBox)).map(
        nextTransform =>
          new SetTransformAction(nextTransform, startTransform, null, config.senseRange),
      ),
    )
    .flatten()

  return {
    action: xs.merge(zoom$, drag$, resetZoom$, zoomToItem$),
  }
}

export default zoom

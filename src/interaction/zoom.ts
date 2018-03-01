import * as d3 from 'd3'
import { Stream } from 'xstream'
import { clamp } from 'ramda'
import xs from 'xstream'
import SetTransformAction from '../actions/SetTransformAction'
import { Component, Point, Rect, UIIntent, AppConfig } from '../interfaces'
import { getBoundingBoxOfPoints } from '../utils/common'
import transition from '../utils/transition'

export interface ZoomConfig {
  targetTransform: d3.ZoomTransform
  useTransition: boolean
  rawPos: Point
}

function isZoomIdentity(transform: d3.ZoomTransform) {
  return transform.x === 0 && transform.y === 0 && transform.k === 1
}

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

function getProperTransform(viewBox: DOMRect, rect: Rect, config: AppConfig, marginRatio: number) {
  const k = clamp(
    config.minScale,
    config.maxScale,
    Math.min(viewBox.width / rect.width, viewBox.height / rect.height) / (1 + marginRatio),
  )
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
  keyboard,
  svgDOMRect: svgDOMRect$,
}) => {
  const mouseZoomConfig$: Stream<ZoomConfig> = xs
    .merge(
      mouse.rawDblclick$.map(pos => ({
        pos,
        delta: 2,
        useTransition: true,
      })),
      mouse.rawWheel$.map(({ pos, deltaY }) => ({
        pos,
        delta: 0.95 ** (deltaY / 100),
        useTransition: false,
      })),
    )
    .sampleCombine(state$, config$, svgDOMRect$)
    .map(
      ([{ pos: rawPos, delta, useTransition }, { transform: startTransform }, config, viewBox]) => {
        const { x, y, k } = startTransform
        const nextK = clamp(config.minScale, config.maxScale, k * delta)
        const factor = nextK / k // 实际的放大率
        const nextX = factor * (x - rawPos.x) + rawPos.x
        const nextY = factor * (y - rawPos.y) + rawPos.y
        const targetTransform = d3.zoomIdentity.translate(nextX, nextY).scale(nextK)
        return {
          rawPos,
          targetTransform,
          useTransition,
        }
      },
    )

  const toItemIntentFromShortcut$ = keyboard
    .shortcut('1')
    .whenNot(state$, state => state.selIdSet.isEmpty())
    .peek(state$)
    .map(state => ({ itemId: state.selIdSet.first() }))

  const toItemZoomConfig$: Stream<ZoomConfig> = xs
    .merge(
      toItemIntentFromShortcut$,
      UI.intent<UIIntent.ZoomToItem>('zoom-to-item'),
      UI.intent('zoom-to-sel').peek(
        state$
          .filter(s => !s.selIdSet.isEmpty())
          .map(state => state.selIdSet.first())
          .map(itemId => ({ itemId })),
      ),
    )
    .sampleCombine(state$, config$, svgDOMRect$)
    .map(([{ itemId }, state, config, viewBox]) => {
      const item = state.items.get(itemId)
      const bbox = getBoundingBoxOfPoints(item.getVertices())
      return {
        targetTransform: getProperTransform(viewBox, bbox, config, 0.8),
        useTransition: true,
        rawPos: null,
      }
    })

  const fitZoomConfig$: Stream<ZoomConfig> = xs
    .merge(keyboard.shortcut('2'), UI.intent('zoom-to-fit'))
    .whenNot(state$, state => state.items.isEmpty())
    .peek(xs.combine(state$, config$, svgDOMRect$))
    .map(([state, config, viewBox]) => {
      const bbox = getBoundingBoxOfPoints(state.items.toList().flatMap(item => item.getVertices()))
      return {
        targetTransform: getProperTransform(viewBox, bbox, config, 0.3),
        useTransition: true,
        rawPos: null,
      }
    })

  const resetZoomConfig$: Stream<ZoomConfig> = xs
    .merge(keyboard.shortcut('3'), UI.intent('reset-zoom'))
    .whenNot(state$, state => isZoomIdentity(state.transform))
    .mapTo({
      targetTransform: d3.zoomIdentity,
      useTransition: true,
      rawPos: null,
    })

  const zoom$ = xs
    .merge(mouseZoomConfig$, toItemZoomConfig$, fitZoomConfig$, resetZoomConfig$)
    .sampleCombine(state$, config$, svgDOMRect$)
    .map(([zoomConfig, { transform: startTransform }, config, viewBox]) => {
      const { rawPos, targetTransform, useTransition } = zoomConfig
      if (useTransition) {
        return transition(250, startTransform, targetTransform, interpolateTransform(viewBox)).map(
          nextTransform =>
            new SetTransformAction(nextTransform, startTransform, rawPos, config.senseRange),
        )
      } else {
        return xs.of(
          new SetTransformAction(targetTransform, startTransform, rawPos, config.senseRange),
        )
      }
    })
    .flatten()

  return {
    action: zoom$,
  }
}

export default zoom

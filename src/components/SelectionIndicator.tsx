import { DOMSource, h, VNode } from '@cycle/dom'
import { always } from 'ramda'
import xs, { Stream } from 'xstream'
import { State } from '../actions'
import { INDICATOR_RECT_SIZE } from '../constants'
import { Point, Selection } from '../interfaces'
import Mouse from '../utils/Mouse'

const SmallCross = ({ x, y, k }: { x: number; y: number; k: number }) =>
  h('g', { attrs: { transform: `translate(${x}, ${y})` } }, [
    h('line', {
      attrs: {
        x1: 0,
        y1: 0,
        x2: INDICATOR_RECT_SIZE / k,
        y2: INDICATOR_RECT_SIZE / k,
        stroke: 'black',
        'stroke-width': 2 / k,
      },
    }),
    h('line', {
      attrs: {
        x1: INDICATOR_RECT_SIZE / k,
        y1: 0,
        x2: 0,
        y2: INDICATOR_RECT_SIZE / k,
        stroke: 'black',
        'stroke-width': 2 / k,
      },
    }),
  ])

const SmallRect = ({ x, y, k }: { x: number; y: number; k: number }) =>
  h('rect', {
    attrs: {
      x,
      y,
      width: INDICATOR_RECT_SIZE / k,
      height: INDICATOR_RECT_SIZE / k,
      stroke: '#666666',
      'stroke-width': 2 / k,
      fill: 'white',
    },
  })

interface BorderLineProps {
  x1: number
  y1: number
  x2: number
  y2: number
  k: number
}

const BorderLine = ({ k, x1, y1, x2, y2 }: BorderLineProps) =>
  h('line', {
    attrs: {
      stroke: '#aaaaaa',
      'stroke-width': 2 / k,
      'stroke-dasharray': `${8 / k},${5 / k}`,
      x1,
      y1,
      x2,
      y2,
    },
  })

export interface Sources {
  DOM: DOMSource
  mouse: Mouse
  state: Stream<State>
  selection: Stream<Selection>
  transform: Stream<d3.ZoomTransform>
}

export interface Sinks {
  DOM: Stream<VNode>
  nextResizer: Stream<string>
}

export default function SelectedItemsIndicator({
  mouse,
  selection: selection$,
  transform: transform$,
  state: state$,
}: Sources): Sinks {
  const bboxAndShapeType$ = xs.combine(selection$, state$).map(([sel, state]) => ({
    bbox: sel.getBBox(state),
    Shape: sel.item(state) ? (sel.item(state).locked ? SmallCross : SmallRect) : null,
  }))

  const shapeConfig$ = xs
    .combine(bboxAndShapeType$, transform$, selection$)
    .map(([{ bbox, Shape }, transform, sel]) => {
      if (bbox == null) {
        return null
      }
      const { x, y } = bbox
      const k = transform.k
      const x0 = x - INDICATOR_RECT_SIZE / 2 / k
      const y0 = y - INDICATOR_RECT_SIZE / 2 / k
      return {
        k,
        x0,
        y0,
        bbox,
        size: INDICATOR_RECT_SIZE / k,
        showShape: sel.mode === 'bbox',
        Shape,
      }
    })

  const nextResizer$ = xs
    .combine(shapeConfig$, mouse.move$)
    .map(([shapeConfig, { x, y }]) => {
      if (shapeConfig) {
        const { Shape, showShape, x0, y0, bbox: { width, height }, size } = shapeConfig
        if (Shape === SmallRect && showShape) {
          const west = x0 <= x && x <= x0 + size
          const vmid = x0 + width / 2 <= x && x <= x0 + width / 2 + size
          const east = x0 + width <= x && x <= x0 + width + size
          const north = y0 <= y && y <= y0 + size
          const hmid = y0 + height / 2 <= y && y <= y0 + height / 2 + size
          const south = y0 + height <= y && y <= y0 + height + size
          if (north && west) return 'nw-resize'
          if (north && vmid) return 'n-resize'
          if (north && east) return 'ne-resize'
          if (hmid && west) return 'w-resize'
          if (hmid && east) return 'e-resize'
          if (south && west) return 'sw-resize'
          if (south && vmid) return 's-resize'
          if (south && east) return 'se-resize'
          return null
        }
      }
      return null
    })
    .whenNot(mouse.pressing$)

  const vdom$ = shapeConfig$.map(shapeConfig => {
    if (shapeConfig == null) {
      return null
    }
    const { k, x0, y0, bbox: { x, y, width, height }, Shape, showShape } = shapeConfig
    return (
      <g role="selected-items-indicator">
        <BorderLine k={k} x1={x} y1={y} x2={x + width} y2={y} />
        <BorderLine k={k} x1={x + width} y1={y} x2={x + width} y2={y + height} />
        <BorderLine k={k} x1={x + width} y1={y + height} x2={x} y2={y + height} />
        <BorderLine k={k} x1={x} y1={y + height} x2={x} y2={y} />
        {showShape ? (
          <g>
            <Shape k={k} x={x0} y={y0} />
            <Shape k={k} x={x0 + width / 2} y={y0} />
            <Shape k={k} x={x0 + width} y={y0} />
            <Shape k={k} x={x0} y={y0 + height / 2} />
            <Shape k={k} x={x0 + width} y={y0 + height / 2} />
            <Shape k={k} x={x0} y={y0 + height} />
            <Shape k={k} x={x0 + width / 2} y={y0 + height} />
            <Shape k={k} x={x0 + width} y={y0 + height} />
          </g>
        ) : (
          <g />
        )}
      </g>
    )
  })

  return { DOM: vdom$, nextResizer: nextResizer$ }
}

import { DOMSource, h, VNode } from '@cycle/dom'
import xs, { Stream } from 'xstream'
import { INDICATOR_CIRCLE_RADIUS, INDICATOR_RECT_SIZE } from '../constants'
import { Rect, State } from '../interfaces'
import Mouse from '../utils/Mouse'

export interface SmallShapeProps {
  x: number
  y: number
  k: number
  style?: { [key: string]: string }
  dataset?: { [key: string]: string }
  attrs?: { [key: string]: string | number | boolean }
}

export const SmallCircle = ({ x, y, k, style, dataset, attrs }: SmallShapeProps) =>
  h('circle', {
    attrs: {
      cx: x,
      cy: y,
      r: INDICATOR_CIRCLE_RADIUS / k,
      'fill-opacity': 0.5,
      stroke: 'black',
      'stroke-width': 2 / k,
      ...attrs,
    },
    style,
    dataset,
  })

export const SmallCross = ({ x, y, k }: SmallShapeProps) =>
  h(
    'g',
    {
      attrs: {
        transform: `translate(${x - INDICATOR_RECT_SIZE / k / 2}, ${y -
          INDICATOR_RECT_SIZE / k / 2})`,
      },
    },
    [
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
    ],
  )

export const SmallRect = ({ x, y, k }: { x: number; y: number; k: number }) =>
  h('rect', {
    attrs: {
      x: x - INDICATOR_RECT_SIZE / k / 2,
      y: y - INDICATOR_RECT_SIZE / k / 2,
      width: INDICATOR_RECT_SIZE / k,
      height: INDICATOR_RECT_SIZE / k,
      stroke: '#666666',
      'stroke-width': 2 / k,
      fill: 'white',
    },
  })

export interface BBoxLineProps {
  x1: number
  y1: number
  x2: number
  y2: number
  k: number
}

export const BBoxLine = ({ k, x1, y1, x2, y2 }: BBoxLineProps) =>
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

export const BBoxIndicator = ({ k, bbox: { x, y, width, height } }: { bbox: Rect; k: number }) => (
  <g className="bbox-indicator">
    <BBoxLine k={k} x1={x} y1={y} x2={x + width} y2={y} />
    <BBoxLine k={k} x1={x + width} y1={y} x2={x + width} y2={y + height} />
    <BBoxLine k={k} x1={x + width} y1={y + height} x2={x} y2={y + height} />
    <BBoxLine k={k} x1={x} y1={y + height} x2={x} y2={y} />
  </g>
)

export interface Sources {
  DOM: DOMSource
  mouse: Mouse
  state: Stream<State>
}

export interface Sinks {
  DOM: Stream<VNode>
  nextResizer: Stream<string>
}

export default function SelectedItemsIndicator({ mouse, state: state$ }: Sources): Sinks {
  const bboxAndShapeType$ = state$.map(state => ({
    bbox: state.getBBox(),
    Shape: state.sitem() ? (state.sitem().locked ? SmallCross : SmallRect) : null,
  }))

  const shapeConfig$ = xs.combine(bboxAndShapeType$, state$).map(([{ bbox, Shape }, state]) => {
    if (bbox == null) {
      return null
    }
    const { x, y } = bbox
    const k = state.transform.k
    const x0 = x - INDICATOR_RECT_SIZE / 2 / k
    const y0 = y - INDICATOR_RECT_SIZE / 2 / k
    return {
      k,
      x0,
      y0,
      bbox,
      size: INDICATOR_RECT_SIZE / k,
      showShape: state.selMode === 'bbox',
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
    const { k, bbox, Shape, showShape } = shapeConfig
    const { x, y, width, height } = bbox
    return (
      <g className="selection-indicator">
        <BBoxIndicator bbox={bbox} k={k} />
        {showShape ? (
          <g className="resizer">
            <Shape k={k} x={x} y={y} />
            <Shape k={k} x={x + width / 2} y={y} />
            <Shape k={k} x={x + width} y={y} />
            <Shape k={k} x={x} y={y + height / 2} />
            <Shape k={k} x={x + width} y={y + height / 2} />
            <Shape k={k} x={x} y={y + height} />
            <Shape k={k} x={x + width / 2} y={y + height} />
            <Shape k={k} x={x + width} y={y + height} />
          </g>
        ) : (
          <g />
        )}
      </g>
    )
  })

  return { DOM: vdom$, nextResizer: nextResizer$ }
}

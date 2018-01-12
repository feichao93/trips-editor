import { ItemId, Item } from '../interfaces'
import { OrderedMap } from 'immutable'
import { getBoundingBoxOfPoints, getItemPoints } from '../utils/common'
import { h } from '@cycle/dom'

const INDICATOR_RECT_SIZE = 12

const SmallCross = ({ x, y, k }: { x: number; y: number; k: number }) => (
  <g transform={`translate(${x}, ${y})`}>
    <line
      x1={0}
      y1={0}
      x2={INDICATOR_RECT_SIZE / k}
      y2={INDICATOR_RECT_SIZE / k}
      stroke="black"
      stroke-width={2 / k}
    />
    <line
      x1={INDICATOR_RECT_SIZE / k}
      y1={0}
      x2={0}
      y2={INDICATOR_RECT_SIZE / k}
      stroke="black"
      stroke-width={2 / k}
    />
  </g>
)

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

export default function SelectedItemsIndicator({
  selectedItems,
  transform,
}: {
  selectedItems: OrderedMap<ItemId, Item>
  transform: d3.ZoomTransform
}) {
  const points = selectedItems.toList().flatMap(getItemPoints)
  if (points.isEmpty()) {
    return null
  }
  const { x, y, width, height } = getBoundingBoxOfPoints(points)

  const k = transform.k

  const x0 = x - INDICATOR_RECT_SIZE / 2 / k
  const y0 = y - INDICATOR_RECT_SIZE / 2 / k

  // todo 目前选中元素总是一个, 所以用.first()即可
  const SmallShape = selectedItems.first().locked ? SmallCross : SmallRect

  return (
    <g role="selected-items-indicator">
      <BorderLine k={k} x1={x} y1={y} x2={x + width} y2={y} />
      <BorderLine k={k} x1={x + width} y1={y} x2={x + width} y2={y + height} />
      <BorderLine k={k} x1={x + width} y1={y + height} x2={x} y2={y + height} />
      <BorderLine k={k} x1={x} y1={y + height} x2={x} y2={y} />
      <SmallShape k={k} x={x0} y={y0} />
      <SmallShape k={k} x={x0 + width / 2} y={y0} />
      <SmallShape k={k} x={x0 + width} y={y0} />
      <SmallShape k={k} x={x0} y={y0 + height / 2} />
      <SmallShape k={k} x={x0 + width} y={y0 + height / 2} />
      <SmallShape k={k} x={x0} y={y0 + height} />
      <SmallShape k={k} x={x0 + width / 2} y={y0 + height} />
      <SmallShape k={k} x={x0 + width} y={y0 + height} />
    </g>
  )
}

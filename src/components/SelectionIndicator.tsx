import { VNode, DOMSource, h } from '@cycle/dom'
import { OrderedMap } from 'immutable'
import { INDICATOR_RECT_SIZE } from '../constants'
import { Item, ItemId } from '../interfaces'
import { getBoundingBoxOfPoints } from '../utils/common'
import xs, { Stream } from 'xstream'

const SmallCross = ({ x, y, k }: { x: number; y: number; k: number; cursor?: string }) =>
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

const SmallRect = ({ x, y, k, cursor }: { x: number; y: number; k: number; cursor?: string }) =>
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
    dataset: { resizer: cursor },
    style: { cursor },
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
  selectedItems: Stream<OrderedMap<ItemId, Item>>
  transform: Stream<d3.ZoomTransform>
}

export interface Sinks {
  DOM: Stream<VNode>
  resizer: Stream<string>
}

export default function SelectedItemsIndicator(sources: Sources): Sinks {
  const { DOM: domSource, selectedItems: selectedItems$, transform: transform$ } = sources
  const resizerSource = domSource.select('*[data-resizer]')

  const enter$ = resizerSource
    .events('mouseover')
    .map(e => (e.ownerTarget as HTMLElement).dataset.resizer)
  const exit$ = resizerSource.events('mouseout').mapTo(null)

  const resizer$ = xs.merge(enter$, exit$)

  const vdom$ = xs.combine(selectedItems$, transform$).map(([selectedItems, transform]) => {
    const points = selectedItems.toList().flatMap(item => item.getPoints())
    if (points.isEmpty()) {
      return null
    }
    const { x, y, width, height } = getBoundingBoxOfPoints(points)

    const k = transform.k
    const x0 = x - INDICATOR_RECT_SIZE / 2 / k
    const y0 = y - INDICATOR_RECT_SIZE / 2 / k

    // TODO 目前选中元素总是一个, 所以用.first()即可
    const SmallShape = selectedItems.first().locked ? SmallCross : SmallRect

    return (
      <g role="selected-items-indicator">
        <BorderLine k={k} x1={x} y1={y} x2={x + width} y2={y} />
        <BorderLine k={k} x1={x + width} y1={y} x2={x + width} y2={y + height} />
        <BorderLine k={k} x1={x + width} y1={y + height} x2={x} y2={y + height} />
        <BorderLine k={k} x1={x} y1={y + height} x2={x} y2={y} />
        <SmallShape cursor="nw-resize" k={k} x={x0} y={y0} />
        <SmallShape cursor="n-resize" k={k} x={x0 + width / 2} y={y0} />
        <SmallShape cursor="ne-resize" k={k} x={x0 + width} y={y0} />
        <SmallShape cursor="w-resize" k={k} x={x0} y={y0 + height / 2} />
        <SmallShape cursor="e-resize" k={k} x={x0 + width} y={y0 + height / 2} />
        <SmallShape cursor="sw-resize" k={k} x={x0} y={y0 + height} />
        <SmallShape cursor="s-resize" k={k} x={x0 + width / 2} y={y0 + height} />
        <SmallShape cursor="se-resize" k={k} x={x0 + width} y={y0 + height} />
      </g>
    )
  })

  return { DOM: vdom$, resizer: resizer$ }
}

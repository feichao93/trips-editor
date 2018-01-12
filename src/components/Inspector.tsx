import { DOMSource, h } from '@cycle/dom'
import { is, List, OrderedMap, OrderedSet } from 'immutable'
import { VNode } from 'snabbdom/vnode'
import xs, { Stream } from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import actions, { Action, State, ZIndexOp } from '../actions'
import { Item, ItemId, PolygonItem } from '../interfaces'
import '../styles/inspector.styl'
import { getBoundingBoxOfPoints, getItemPoints, round3 } from '../utils/common'

export interface Sources {
  DOM: DOMSource
  mode: Stream<string>
  state: Stream<State>
}

export interface Sinks {
  DOM: Stream<VNode>
  actions: Stream<Action>
}

function Row({ label }: { label: string }, children: VNode[]) {
  return h('div.row', [h('h2', label), ...children])
}

type EditableFieldProps = {
  label: string
  field: string
  type: string
  value: number | string
  [key: string]: any
}
function EditableField(
  { label, type, value, field, ...otherProps }: EditableFieldProps,
  children: VNode[] = [],
) {
  return h('div.field', [
    h('input', { dataset: { field }, attrs: { type, value, ...otherProps } }),
    h('p', label),
  ])
}

function PositionAndSize({ sids, items }: State) {
  if (sids.isEmpty()) {
    return null
  }
  const selectedItems = items.filter(item => sids.has(item.id))
  const points = selectedItems.toList().flatMap(getItemPoints)
  const { x, y, width, height } = getBoundingBoxOfPoints(points)
  return h('div', [
    Row({ label: 'Position' }, [
      EditableField({ field: 'x', label: 'X', type: 'number', value: round3(x) }),
      EditableField({ field: 'y', label: 'Y', type: 'number', value: round3(y) }),
    ]),
    Row({ label: 'Side' }, [
      EditableField({
        field: 'width',
        label: 'width',
        type: 'number',
        disabled: true,
        value: round3(width),
      }),
      EditableField({
        field: 'height',
        label: 'Height',
        type: 'number',
        disabled: true,
        value: round3(height),
      }),
    ]),
  ])
}

function Fill(sitem: Item) {
  if (sitem == null) {
    return null
  }
  if (sitem instanceof PolygonItem) {
    return Row({ label: 'Fill' }, [
      EditableField({ field: 'fill', label: 'Fill', type: 'color', value: sitem.fill }),
    ])
  }
  return null
}

function Stroke(sitem: Item) {
  if (sitem == null) {
    return null
  }
  if (sitem instanceof PolygonItem /* || sitem instanceof PolylineItem */) {
    return Row({ label: 'Stroke' }, [
      EditableField({ field: 'stroke', label: 'Stroke', type: 'color', value: sitem.stroke }),
      EditableField({
        field: 'strokeWidth',
        label: 'Stroke Width',
        type: 'number',
        value: sitem.strokeWidth,
        min: 0,
        step: 0.1,
      }),
    ])
  }
  return null
}

function Opacity(sitem: Item) {
  if (sitem == null) {
    return null
  }
  return Row({ label: 'Opacity' }, [
    EditableField({
      field: 'opacity',
      label: 'Opacity',
      type: 'number',
      value: sitem.opacity,
      min: 0,
      max: 1,
      step: 0.1,
    }),
  ])
}

function Z({ sids, zlist }: State) {
  if (sids.isEmpty()) {
    return null
  }
  const sidsList = sids.toList()
  const sidsCount = sids.count()
  const isAtBottom = is(sidsList.sort(), zlist.take(sidsCount).sort())
  const isAtTop = is(sidsList.sort(), zlist.takeLast(sidsCount).sort())

  return Row({ label: 'Z-index' }, [
    h(
      'button.btn',
      { attrs: { disabled: isAtBottom }, dataset: { action: 'z-bottom' } },
      '置于底层',
    ),
    h('button.btn', { attrs: { disabled: isAtBottom }, dataset: { action: 'z-dec' } }, '降低一层'),
    h('button.btn', { attrs: { disabled: isAtTop }, dataset: { action: 'z-inc' } }, '提高一层'),
    h('button.btn', { attrs: { disabled: isAtTop }, dataset: { action: 'z-top' } }, '置于顶层'),
  ])
}

export default function Inspector(sources: Sources): Sinks {
  const domSource = sources.DOM
  const mode$ = sources.mode
  const state$ = sources.state
  const zIndexAction$ = domSource
    .select('*[data-action]')
    .events('click')
    .map(e => actions.updateZIndex((e.ownerTarget as HTMLButtonElement).dataset.action as ZIndexOp))

  // TODO editAction还不完善，X和Y的编辑有点问题
  const editAction$ = domSource
    .select('.field input')
    .events('input')
    .compose(sampleCombine(state$))
    .map(([e, state]) => {
      const input = e.ownerTarget as HTMLInputElement
      const field = input.dataset.field as any
      const value = input.type === 'number' ? Number(input.value) : input.value
      const sitems = state.items.filter(item => state.sids.has(item.id))
      const updatedItems = sitems.map(item => item.set(field, value))
      return actions.updateItems(updatedItems)
    })

  const sitem$ = state$.map(s => {
    if (s.sids.count() !== 1) {
      return null
    } else {
      return s.items.get(s.sids.first())
    }
  })

  const vdom$ = xs
    .combine(mode$, state$)
    .compose(sampleCombine(sitem$))
    .map(([[mode, state], sitem]) =>
      h('div.inspector', [
        h('p', ['Current Mode: ', mode]),
        PositionAndSize(state),
        Fill(sitem),
        Stroke(sitem),
        Opacity(sitem),
        Z(state),
      ]),
    )
  return {
    DOM: vdom$,
    actions: xs.merge(editAction$, zIndexAction$),
  }
}

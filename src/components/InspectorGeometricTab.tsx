import { h, VNode } from '@cycle/dom'
import { is } from 'immutable'
import xs from 'xstream'
import { Sinks, Sources } from './Inspector'
import { Item, Sel, State, UIIntent } from '../interfaces'
import { isPolygonItem, isPolylineItem, round3 } from '../utils/common'

function Row({ label, key }: { label: string; key: string }, children: VNode[]) {
  return h('div.row', { key }, [h('h2', label), ...children])
}

type EditableFieldProps = {
  label: string
  field: string
  type: string
  value: number | string
  [key: string]: any
}

function EditableField({ label, type, value, field, ...otherProps }: EditableFieldProps) {
  return h('div.field', [
    h('input', { dataset: { field }, attrs: { type, value, ...otherProps } }),
    h('p', label),
  ])
}

function PositionAndSize(state: State, sel: Sel) {
  const bbox = sel.getBBox(state)
  if (bbox == null) {
    return null
  }
  const { x, y, width, height } = bbox
  return h('div', [
    Row({ label: 'Position', key: 'position' }, [
      EditableField({ field: 'x', label: 'X', type: 'number', disabled: true, value: round3(x) }),
      EditableField({ field: 'y', label: 'Y', type: 'number', disabled: true, value: round3(y) }),
    ]),
    Row({ label: 'Size', key: 'size' }, [
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
  if (isPolygonItem(sitem)) {
    return Row({ label: 'Fill', key: 'fill' }, [
      EditableField({ field: 'fill', label: 'Fill', type: 'color', value: sitem.fill }),
    ])
  }
  return null
}

function Stroke(sitem: Item) {
  if (sitem == null) {
    return null
  }
  if (isPolygonItem(sitem) || isPolylineItem(sitem)) {
    return Row({ label: 'Stroke', key: 'stroke' }, [
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
  return Row({ label: 'Opacity', key: 'opacity' }, [
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

function Z({ items, zlist }: State, sel: Sel) {
  if (sel.isEmpty()) {
    return null
  }
  const sidsList = sel.idSet.toList()
  const sidsCount = sel.idSet.count()
  const isAtBottom = is(sidsList.sort(), zlist.take(sidsCount).sort())
  const isAtTop = is(sidsList.sort(), zlist.takeLast(sidsCount).sort())

  const zIndex = zlist.indexOf(sel.idSet.first())

  return Row({ label: 'Z-index', key: 'z' }, [
    h('p', String(zIndex)),
    h('button.btn.z', { attrs: { disabled: isAtBottom }, dataset: { op: 'bottom' } }, '置于底层'),
    h('button.btn.z', { attrs: { disabled: isAtBottom }, dataset: { op: 'dec' } }, '降低一层'),
    h('button.btn.z', { attrs: { disabled: isAtTop }, dataset: { op: 'inc' } }, '提高一层'),
    h('button.btn.z', { attrs: { disabled: isAtTop }, dataset: { op: 'top' } }, '置于顶层'),
  ])
}

function LockInfo(sitem: Item) {
  if (sitem == null) {
    return null
  }
  return Row(
    { label: 'Lock', key: 'lock' },
    sitem.locked
      ? [h('h2', 'locked'), h('button.toggle-lock', 'Unlock')]
      : [h('h2', 'not locked'), h('button.toggle-lock', 'Lock')],
  )
}

export default function InspectorGeometricTab(sources: Sources): Sinks {
  const domSource = sources.DOM
  const state$ = sources.state
  const sel$ = sources.sel

  const changeZIndexIntent$ = domSource
    .select('.btn.z')
    .events('click')
    .map(e => e.ownerTarget.dataset.op)
    .map(op => ({ type: 'change-z-index', op } as UIIntent.ChangeZIndex))

  const toggleLockIntent$ = domSource
    .select('.toggle-lock')
    .events('click')
    .mapTo<'toggle-lock'>('toggle-lock')

  const editIntent$ = domSource
    .select('.field input')
    .events('input')
    .map<UIIntent.Edit>(e => {
      const input = e.ownerTarget as HTMLInputElement
      const field = input.dataset.field
      return { type: 'edit', field, value: input.value }
    })

  const vdom$ = xs.combine(state$, sel$).map(([state, sel]) => {
    const sitem = sel.item(state)
    if (sitem == null) {
      return null
    }
    return h('div.tab.geometric-tab', [
      PositionAndSize(state, sel),
      Fill(sitem),
      Stroke(sitem),
      Opacity(sitem),
      Z(state, sel),
      LockInfo(sitem),
    ])
  })

  return {
    DOM: vdom$,
    intent: xs.merge(editIntent$, changeZIndexIntent$, toggleLockIntent$),
  }
}

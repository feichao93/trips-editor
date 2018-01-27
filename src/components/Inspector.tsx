import { DOMSource, h } from '@cycle/dom'
import { is } from 'immutable'
import { VNode } from 'snabbdom/vnode'
import xs, { Stream } from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import actions, { Action, State, ZIndexOp } from '../actions'
import { Item, Selection } from '../interfaces'
import '../styles/inspector.styl'
import { isPolygonItem, isPolylineItem, round3 } from '../utils/common'

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
  selection: Stream<Selection>
}

export interface Sinks {
  DOM: Stream<VNode>
  action: Stream<Action>
}

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

function PositionAndSize(state: State, selection: Selection) {
  const bbox = selection.getBBox(state)
  if (bbox == null) {
    return null
  }
  const { x, y, width, height } = bbox
  return h('div', [
    Row({ label: 'Position', key: 'position' }, [
      EditableField({ field: 'x', label: 'X', type: 'number', disabled: true, value: round3(x) }),
      EditableField({ field: 'y', label: 'Y', type: 'number', disabled: true, value: round3(y) }),
    ]),
    Row({ label: 'Side', key: 'side' }, [
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

function Z({ items, zlist }: State, selection: Selection) {
  if (selection.isEmpty()) {
    return null
  }
  const sidsList = selection.sids.toList()
  const sidsCount = selection.sids.count()
  const isAtBottom = is(sidsList.sort(), zlist.take(sidsCount).sort())
  const isAtTop = is(sidsList.sort(), zlist.takeLast(sidsCount).sort())

  const zIndex = zlist.indexOf(selection.sids.first())

  return Row({ label: 'Z-index', key: 'z' }, [
    h('p', String(zIndex)),
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

function LockInfo(sitem: Item) {
  if (sitem == null) {
    return null
  }
  return Row(
    { label: 'Lock', key: 'lock' },
    sitem.locked
      ? [h('h2', 'locked'), h('button', { dataset: { action: 'unlock' } }, 'Unlock')]
      : [h('h2', 'not locked'), h('button', { dataset: { action: 'lock' } }, 'Lock')],
  )
}

export default function Inspector(sources: Sources): Sinks {
  const domSource = sources.DOM
  const state$ = sources.state
  const selection$ = sources.selection
  const zIndexAction$ = domSource
    .select('*[data-action]')
    .events('click')
    .sampleCombine(selection$)
    .map(([e, sel]) =>
      actions.updateZIndex(sel, (e.ownerTarget as HTMLButtonElement).dataset.action as ZIndexOp),
    )

  const lockAction$ = domSource
    .select('*[data-action=lock]')
    .events('click')
    .peek(selection$)
    .map(actions.lockItems)
  const unlockAction$ = domSource
    .select('*[data-action=unlock]')
    .events('click')
    .peek(selection$)
    .map(actions.unlockItems)

  // TODO editAction还不完善，X和Y的编辑有点问题
  const editAction$ = domSource
    .select('.field input')
    .events('input')
    .compose(sampleCombine(state$, selection$))
    .map(([e, state, selection]) => {
      const input = e.ownerTarget as HTMLInputElement
      const field = input.dataset.field as any
      const value = input.type === 'number' ? Number(input.value) : input.value
      const sitems = state.items.filter(item => selection.sids.has(item.id))
      const updatedItems = sitems.map(item => item.set(field, value))
      return actions.updateItems(updatedItems)
    })

  const vdom$ = xs.combine(state$, selection$).map(([state, sel]) => {
    const sitem = sel.item(state)
    return h('div.inspector', { style: { display: sitem == null ? 'none' : 'block' } }, [
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
    action: xs.merge(editAction$, zIndexAction$, lockAction$, unlockAction$),
  }
}

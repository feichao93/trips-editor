import { h, VNode } from '@cycle/dom'

export function Row({ label, key }: { label: string; key: string }, children: VNode[]) {
  return h('div.row', { key }, [h('h2', label), ...children])
}

export type EditableFieldProps = {
  label: string
  field: string
  type: string
  value: number | string
  [key: string]: any
}

export function EditableField({ label, type, value, field, ...otherProps }: EditableFieldProps) {
  return h('div.field', [
    h('input', { dataset: { field }, attrs: { type, ...otherProps }, props: { value } }),
    h('p', label),
  ])
}

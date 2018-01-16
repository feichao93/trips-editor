import { List, Map, OrderedSet, Record } from 'immutable'
import { State } from '../actions'
import { Item, ItemId, Point, Rect } from '../interfaces'
import { getBoundingBoxOfPoints } from './common'

export type SelectionMode = 'bbox' | 'vertices'

// Some magic to make Immutable.js Object-Oriented
interface SelectionRecordGeneric<TProps extends Object> {
  (values?: Partial<TProps> | Iterable<[string, any]>): Record<TProps> &
    Readonly<TProps> &
    SelectionRecordExtra
}
function makeSelectionRecord<TProps>(
  defaultValues: TProps,
  name?: string,
): SelectionRecordGeneric<TProps> {
  return Record(defaultValues) as any
}
interface SelectionRecordExtra {
  item(state: State): Item
  selectedItems(state: State): Map<ItemId, Item>
  vertices(state: State): List<Point>
  isEmpty(): boolean
  toggleMode(): this
  getBBox(state: State): Rect
}

const SelectionRecord = makeSelectionRecord({
  sids: OrderedSet<ItemId>(),
  mode: 'bbox' as SelectionMode,
})
SelectionRecord.prototype.selectedItems = function selectedItems(
  this: SelectionRecord,
  state: State,
) {
  return state.items.filter(item => this.sids.has(item.id))
}
SelectionRecord.prototype.item = function item(this: SelectionRecord, state: State) {
  return state.items.find(item => this.sids.has(item.id)) || null
}
SelectionRecord.prototype.vertices = function item(this: SelectionRecord, state: State) {
  const item = this.item(state)
  if (this.mode !== 'vertices' || item == null) {
    return List()
  } else {
    return item.points
  }
}
SelectionRecord.prototype.isEmpty = function isEmpty(this: SelectionRecord) {
  return this.sids.isEmpty()
}
SelectionRecord.prototype.toggleMode = function toggleMode(this: SelectionRecord) {
  if (this.mode === 'bbox') {
    return this.set('mode', 'vertices')
  } else {
    return this.set('mode', 'bbox')
  }
}
SelectionRecord.prototype.getBBox = function toggleMode(this: SelectionRecord, state: State) {
  const selectedItems = this.selectedItems(state)
  const points = selectedItems.toList().flatMap(item => item.getPoints())
  return getBoundingBoxOfPoints(points)
}

export const selectionRecord = SelectionRecord()
type SelectionRecord = typeof selectionRecord

export default SelectionRecord

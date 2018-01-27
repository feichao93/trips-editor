import { Record, List } from 'immutable'
import { Point, ResizeDirConfig } from '../interfaces'
import { VNode } from '@cycle/dom'

export interface ItemRecordFactory<TProps extends Object> {
  (values?: Partial<TProps> | Iterable<[string, any]>): Record<TProps> &
    Readonly<TProps> &
    ItemRecord
}

// Default methods of Item interface.
const defaultMethods: ItemRecord = {
  render() {
    console.warn('Using default render()')
    return null
  },
  getVertices() {
    console.warn('Using default getVertices()!')
    return List()
  },
  containsPoint() {
    console.warn('Using default containsPoint()!')
    return false
  },
  move() {
    console.warn('Using defualt move()!')
    return this
  },
  resize() {
    console.warn('Using default resize()!')
    return this
  },
  supportEditVertex() {
    console.warn('Using default supportEditVertex')
    return false
  },
  deleteVertex() {
    if (this.supportEditVertex()) {
      console.warn('Using default deleteVertex()')
    }
    return this
  },
  moveVertex() {
    if (this.supportEditVertex()) {
      console.warn('Using default moveVertex()')
    }
    return this
  },
}

export function ItemRecord<TProps, Static>(
  name: string,
  defaultValues: TProps,
  staticMethods: Static,
): ItemRecordFactory<TProps> & Static {
  const recordFactory = Record(defaultValues, name) as any
  Object.assign(recordFactory, staticMethods)
  Object.assign(recordFactory.prototype, defaultMethods)
  return recordFactory
}

// ItemRecord统一接口
export interface ItemRecord {
  render(): VNode
  resize(anchor: Point, resizeDirConfig: ResizeDirConfig, startPos: Point, endPos: Point): this
  getVertices(): List<Point>
  containsPoint(point: Point): boolean
  move(dx: number, dy: number): this
  supportEditVertex(): boolean
  deleteVertex(vertexIndex: number): this
  moveVertex(vertexIndex: number, dx: number, dy: number): this
}

type ItemBase = {
  id: number
  locked: boolean
  opacity: number
}

type Item = Record<ItemBase> & Readonly<ItemBase> & ItemRecord

export default Item

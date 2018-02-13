import { h } from '@cycle/dom'
import { List, Record, Set } from 'immutable'
import { add, identity } from 'ramda'
import { containsPoint, getCoordinateUpdater } from './common'
import { ItemMethods, Point, ResizeDirConfig } from '../interfaces'
import { ImgFileStat } from '../makeFileDriver'

const ImgItemRecord = Record(
  {
    id: -1,
    locked: false,
    label: '',
    tags: Set<string>(),
    opacity: 1,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    naturalWidth: 0,
    naturalHeight: 0,
    url: '',
  },
  'ImgItem',
)

export default class ImgItem extends ImgItemRecord implements ItemMethods {
  static fromImgFileStat({ file, naturalHeight, naturalWidth, url }: ImgFileStat) {
    return new ImgItem({
      naturalWidth,
      naturalHeight,
      width: naturalWidth,
      height: naturalHeight,
      url,
    })
  }

  toJS() {
    // null means that this item does not support serialization.
    return null as any
  }

  render() {
    return h('image', {
      key: this.id,
      attrs: {
        x: this.x,
        y: this.y,
        href: this.url,
        width: this.width,
        height: this.height,
        opacity: this.opacity,
      },
    })
  }

  resize(anchor: Point, { h, v }: ResizeDirConfig, startPos: Point, endPos: Point) {
    if (this.locked) {
      return this
    }
    const vertices = this.getVertices()
    const ratio = this.height / this.width
    const xUpdater = h ? getCoordinateUpdater(anchor.x, startPos.x, endPos.x) : identity
    const yUpdater = v ? getCoordinateUpdater(anchor.y, startPos.y, endPos.y) : identity

    const updatedVertices = vertices.map(p => ({ x: xUpdater(p.x), y: yUpdater(p.y) }))

    const nextX = updatedVertices.map(p => p.x).min()
    const nextY = updatedVertices.map(p => p.y).min()
    const nextWidth = updatedVertices.map(p => p.x).max() - nextX
    const nextHeight = updatedVertices.map(p => p.y).max() - nextY
    // TODO Use a correct implementation
    return this.set('x', nextX)
      .set('y', nextY)
      .set('width', Math.max(nextWidth, nextHeight / ratio))
      .set('height', Math.max(nextHeight, nextWidth * ratio))
  }

  move(dx: number, dy: number) {
    if (this.locked) {
      return this
    }
    return this.update('x', add(dx)).update('y', add(dy))
  }

  getVertices() {
    return List([
      { x: this.x, y: this.y },
      { x: this.x + this.width, y: this.y },
      { x: this.x + this.width, y: this.y + this.height },
      { x: this.x, y: this.y + this.height },
    ])
  }

  containsPoint(p: Point) {
    return containsPoint(this.getVertices().toArray(), p)
  }

  supportEditVertex() {
    return false
  }

  getShortDescription() {
    return `ImgItem ${this.id}`
  }
}

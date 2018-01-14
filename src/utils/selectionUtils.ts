import { getBoundingBoxOfPoints } from './common'
import { Selection } from '../interfaces'

export function getBBox(selection: Selection) {
  const points = selection.toList().flatMap(item => item.getPoints())
  return getBoundingBoxOfPoints(points)
}

import { identical } from 'ramda'
import SetTransformAction from '../actions/SetTransformAction'
import { Component } from '../interfaces'

const dragBoard: Component = ({ mouse, mode: mode$, state: state$, config: config$ }) => {
  const dragStart$ = mouse.rawDown$
    .when(mode$, identical('idle'))
    .whenNot(mouse.isBusy$)
    .sampleCombine(state$, config$)
    .map(([rawPos, state, config]) => {
      const pos = state.transform.invertPos(rawPos)
      const clickedItems = state.items.filter(item => item.containsPoint(pos))
      if (clickedItems.every(item => item.locked)) {
        return { rawPos, transform: state.transform, senseRange: config.senseRange }
      }
      return null
    })
    .filter(Boolean)

  const dragBoard$ = dragStart$
    .map(dragStart =>
      mouse.rawMove$
        .map(rawPos => {
          const k = dragStart.transform.k
          const dx = rawPos.x - dragStart.rawPos.x
          const dy = rawPos.y - dragStart.rawPos.y
          const target = dragStart.transform.translate(dx / k, dy / k)
          return new SetTransformAction(target, dragStart.transform, null, dragStart.senseRange)
        })
        .endWhen(mouse.up$),
    )
    .flatten()

  return {
    action: dragBoard$,
  }
}

export default dragBoard

import { DOMSource, h, VNode } from '@cycle/dom'
import { OrderedSet } from 'immutable'
import xs, { Stream } from 'xstream'
import DeleteIcon from './common/DeleteIcon'
import { State, UIIntent } from '../interfaces'
import '../styles/Structure.styl'

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
}

export interface Sinks {
  DOM: Stream<VNode>
  intent: Stream<UIIntent>
}

export default function Structure({ state: state$, DOM: domSource }: Sources): Sinks {
  const changeSelIntent$ = domSource
    .select('.item .text')
    .events('click')
    .map<UIIntent>(e => ({
      type: 'change-sel',
      itemIdArray: [Number(e.ownerTarget.parentElement.dataset.itemId)],
    }))

  const deleteItemsIntent$ = domSource
    .select('.item .delete-btn')
    .events('click')
    .map<UIIntent>(e => ({
      type: 'delete-items',
      itemIdArray: [Number(e.ownerTarget.parentElement.dataset.itemId)],
    }))

  const vdom$ = state$.map(state =>
    h('div.structure', [
      h(
        'ul.item-list',
        state.zlist
          .map(itemId => {
            const item = state.items.get(itemId)
            return h(
              'li.item',
              {
                key: itemId,
                dataset: { itemId: String(itemId) },
                class: { selected: state.selIdSet.has(itemId) },
              },
              [
                h('span.text', `${itemId} ${item.constructor.name}`),
                DeleteIcon({ className: 'delete-btn' }),
              ],
            )
          })
          .toArray(),
      ),
    ]),
  )

  return {
    DOM: vdom$,
    intent: xs.merge(changeSelIntent$, deleteItemsIntent$),
  }
}

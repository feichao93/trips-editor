import { DOMSource, h } from '@cycle/dom'
import { is } from 'immutable'
import { VNode } from 'snabbdom/vnode'
import xs, { Stream } from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import { Sinks, Sources } from './Inspector'
import { Item, Sel } from '../interfaces'
import { isPolygonItem, isPolylineItem, round3 } from '../utils/common'

export default function InspectorSemanticTab({
  state: state$,
  sel: sel$,
  DOM: domSource,
}: Sources): Sinks {
  const vdom$ = xs.of(h('div.tab.semantic-tab', [h('h1', 'This tab is working in progress')]))
  // const newNode$ = domSource.select('*[data-intent=new-node]').events('click')
  // const destroyNode$ = domSource.select('*[data-intent=destroy=node]').events('click')

  // const itemsAndNodes$ = xs.combine(state$, sel$).map(([state, sel]) => {
  //   const items = sel.items(state)
  //   const nodes = state.nodes.filter(node => items.some(item => node.idSet.includes(item.id)))
  //   return { items, nodes }
  // })

  // const vdom$ = itemsAndNodes$.map(({ items, nodes }) => {
  //   let buttons = null
  //   if (nodes.isEmpty()) {
  //     buttons = h('div.buttons', [
  //       h('button', { dataset: { intent: 'new-node' } }, 'Create a New Semantic Node'),
  //     ])
  //   } else {
  //     buttons = h('div.buttons', [h('button', { dataset: { intent: 'destroy-node' } }, 'Destroy')])
  //   }
  //   return h(
  //     'div.tab.semantic-tab',
  //     [buttons, h('div', JSON.stringify(items)), h('div', JSON.stringify(nodes))].filter(Boolean),
  //   )
  // })

  return {
    DOM: vdom$,
    intent: xs.never(),
  }
}

import { h } from '@cycle/dom'
import xs from 'xstream'
import { Sinks, Sources } from './Inspector'

export default function InspectorHistoiryTab({ appHistory: appHistory$ }: Sources): Sinks {
  const vdom$ = appHistory$.map(({ list, index }) =>
    h(
      'div.tab.history-tab',
      index === -1
        ? [h('p.empty-prompt', 'No Action History.')]
        : h(
            'ol.action-list',
            list
              .map((action, i) =>
                h(
                  'li.action-item',
                  {
                    style: index === i ? { 'border-bottom': '3px solid red' } : null,
                  },
                  action.constructor.name,
                ),
              )
              .toArray(),
          ),
    ),
  )

  return {
    DOM: vdom$,
    intent: xs.never(),
  }
}

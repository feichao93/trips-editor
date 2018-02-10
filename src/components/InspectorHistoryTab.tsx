import { h } from '@cycle/dom'
import xs from 'xstream'
import { Sinks, Sources } from './Inspector'
import { emptyAction } from '../utils/AppHistory'

export default function InspectorHistoiryTab({
  DOM: domSource,
  appHistory: appHistory$,
}: Sources): Sinks {
  const vdom$ = appHistory$.map(history =>
    h(
      'div.tab.history-tab',
      history.list.isEmpty()
        ? [h('p.empty-prompt', 'No Action History.')]
        : [
            h('div.button-group', [
              h(
                'button.undo',
                { attrs: { disabled: history.getLastAction() === emptyAction } },
                'Undo',
              ),
              h(
                'button.redo',
                { attrs: { disabled: history.getNextAction() === emptyAction } },
                'Redo',
              ),
            ]),
            h(
              'ol.action-list',
              history.list
                .map((action, i) =>
                  h(
                    'li.action-item',
                    {
                      style: i > history.index ? { color: '#999999' } : null,
                    },
                    action.getMessage(),
                  ),
                )
                .toArray(),
            ),
          ],
    ),
  )

  const undoIntent$ = domSource
    .select('.undo')
    .events('click')
    .mapTo<'undo'>('undo')
  const redoIntent$ = domSource
    .select('.redo')
    .events('click')
    .mapTo<'redo'>('redo')

  return {
    DOM: vdom$,
    intent: xs.merge(undoIntent$, redoIntent$),
  }
}

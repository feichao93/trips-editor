import { h } from '@cycle/dom'
import xs from 'xstream'
import { Sinks, Sources } from './Inspector'
import AppHistory, { emptyAction } from '../utils/AppHistory'

// TODO Change these config according to page height
const ACTION_PER_PAGE = 30
const MAX_ACTIVE_ACTION_COUNT = 20
const MAX_INACTIVE_ACTION_COUNT = 10

function ActionList(history: AppHistory) {
  let offset = 0
  const activeCount = history.index + 1
  const inactiveCount = history.list.count() - activeCount
  if (activeCount <= MAX_ACTIVE_ACTION_COUNT) {
    offset = 0
  } else if (inactiveCount <= MAX_INACTIVE_ACTION_COUNT) {
    offset = Math.max(0, history.list.count() - ACTION_PER_PAGE)
  } else {
    offset = activeCount - MAX_ACTIVE_ACTION_COUNT
  }

  return h(
    'ol.action-list',
    { attrs: { start: 1 + offset } },
    history.list
      .slice(offset, offset + ACTION_PER_PAGE)
      .map((action, i) =>
        h(
          'li.action-item',
          {
            key: i + offset,
            style: i + offset > history.index ? { color: '#999999' } : null,
          },
          action.getMessage(),
        ),
      )
      .toArray(),
  )
}

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
              h('button.clear-history', 'Clear'),
            ]),
            ActionList(history),
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
  const clearHistoryIntent$ = domSource
    .select('.clear-history')
    .events('click')
    .mapTo<'clear-history'>('clear-history')

  return {
    DOM: vdom$,
    intent: xs.merge(undoIntent$, redoIntent$, clearHistoryIntent$),
  }
}

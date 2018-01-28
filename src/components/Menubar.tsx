import { DOMSource, h, VNode } from '@cycle/dom'
import { identical } from 'ramda'
import xs, { Stream } from 'xstream'
import { Selection } from '../interfaces'
import '../styles/Menubar.styl'

export interface Sources {
  DOM: DOMSource
  selection: Stream<Selection>
}

export interface Sinks {
  DOM: Stream<VNode>
  intent: (interested: string) => Stream<string>
}

export interface MenuItem {
  name: string
  hint?: string
  action?: string
  disabled?: boolean
}

export interface MenuCategoryProps {
  active: boolean
  category: string
  items: MenuItem[]
}

function MenuCategory({ active, category, items }: MenuCategoryProps) {
  return h('div.category', [
    h('div.title', { dataset: { category }, class: { active } }, category),
    h(
      'ol.menu-item-list',
      { style: { display: active ? 'block' : 'none' } },
      items.map(({ name, hint, action, disabled }) =>
        h(
          'li.menu-item',
          { dataset: { action }, class: { disabled } },
          [h('p', name), hint ? h('p.hint', hint) : null].filter(Boolean),
        ),
      ),
    ),
  ])
}

export default function Menubar(sources: Sources): Sinks {
  const domSource = sources.DOM
  const sel$ = sources.selection
  const nextActiveCategoryProxy$ = xs.create<string>()

  const activeCategory$ = nextActiveCategoryProxy$.dropRepeats().startWith(null)

  const blur$ = domSource
    .select('.menubar')
    .events('blur')
    .mapTo(null)

  const closeAfterChooseAction$ = domSource
    .select('.menu-item')
    .events('click')
    .filter(e => !e.ownerTarget.classList.contains('disabled'))
    .mapTo(null)

  const clickToToggleCategory$ = domSource
    .select('.category .title')
    .events('click')
    .map(e => e.ownerTarget.dataset.category)

  const mouseoverToFocusCategory$ = domSource
    .select('.category .title')
    .events('mouseover')
    .when(activeCategory$)
    .map(e => e.ownerTarget.dataset.category)

  nextActiveCategoryProxy$.imitate(
    xs.merge(
      blur$,
      closeAfterChooseAction$,
      clickToToggleCategory$
        .sampleCombine(activeCategory$)
        .map(([next, active]) => (next === active ? null : next)),
      mouseoverToFocusCategory$,
    ),
  )

  const intent$ = domSource
    .select('*[data-action]')
    .events('click')
    .filter(e => !e.ownerTarget.classList.contains('disabled'))
    .map(e => e.ownerTarget.dataset.action)

  const vdom$ = xs.combine(activeCategory$, sel$).map(([activeCategory, sel]) =>
    h('div.menubar', { attrs: { tabIndex: 1 } }, [
      MenuCategory({
        category: 'File',
        active: activeCategory === 'File',
        items: [
          { name: 'Save as JSON', disabled: true },
          { name: 'Load JSON', disabled: true },
          { name: 'Export as SVG', disabled: true },
          { name: 'Load Image', disabled: true },
        ],
      }),
      MenuCategory({
        category: 'Edit',
        active: activeCategory === 'Edit',
        items: [
          { name: 'Delete Selection', disabled: sel.isEmpty(), hint: 'D', action: 'delete' },
          { name: 'Add Rectangle', hint: 'R', action: 'rect' },
          { name: 'Add Polygon', hint: 'P', action: 'polygon' },
          { name: 'Add Line', hint: 'L', action: 'line' },
        ],
      }),
    ]),
  )

  return {
    DOM: vdom$,
    intent: interested => intent$.filter(identical(interested)),
  }
}

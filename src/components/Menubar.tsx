import { DOMSource, h, VNode } from '@cycle/dom'
import { identical } from 'ramda'
import xs, { Stream } from 'xstream'
import { Sel } from '../interfaces'
import '../styles/Menubar.styl'

export interface Sources {
  DOM: DOMSource
  sel: Stream<Sel>
}

export interface Sinks {
  DOM: Stream<VNode>
  intent: (interested: string) => Stream<string>
}

export interface MenuItem {
  name: string
  hint?: string
  intent?: string
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
      items.map(({ name, hint, intent, disabled }) =>
        h(
          'li.menu-item',
          { dataset: { intent }, class: { disabled } },
          [h('p', name), hint ? h('p.hint', hint) : null].filter(Boolean),
        ),
      ),
    ),
  ])
}

export default function Menubar(sources: Sources): Sinks {
  const domSource = sources.DOM
  const sel$ = sources.sel
  const nextActiveCategoryProxy$ = xs.create<string>()

  const activeCategory$ = nextActiveCategoryProxy$.dropRepeats().startWith(null)

  const closeWhenBlur$ = domSource
    .select('.menubar')
    .events('blur')
    .mapTo(null)

  const closeWhenMakeIntent$ = domSource
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
      closeWhenBlur$,
      closeWhenMakeIntent$,
      clickToToggleCategory$
        .sampleCombine(activeCategory$)
        .map(([next, active]) => (next === active ? null : next)),
      mouseoverToFocusCategory$,
    ),
  )

  const intent$ = domSource
    .select('*[data-intent]')
    .events('click')
    .filter(e => !e.ownerTarget.classList.contains('disabled'))
    .map(e => e.ownerTarget.dataset.intent)

  const vdom$ = xs.combine(activeCategory$, sel$).map(([activeCategory, sel]) =>
    h('div.menubar', { attrs: { tabIndex: 1 } }, [
      MenuCategory({
        category: 'File',
        active: activeCategory === 'File',
        items: [
          { name: 'Save as JSON', intent: 'save', hint: 'Ctrl+S' },
          { name: 'Load JSON', intent: 'load' },
          { name: 'Export as SVG', disabled: true },
          { name: 'Load Image', disabled: true },
        ],
      }),
      MenuCategory({
        category: 'Edit',
        active: activeCategory === 'Edit',
        items: [
          { name: 'Delete Selection', disabled: sel.isEmpty(), hint: 'D', intent: 'delete' },
          { name: 'Add Rectangle', hint: 'R', intent: 'rect' },
          { name: 'Add Polygon', hint: 'P', intent: 'polygon' },
          { name: 'Toggle Lock', disabled: sel.isEmpty(), hint: 'L', intent: 'toggle-lock' },
        ],
      }),
    ]),
  )

  return {
    DOM: vdom$,
    intent: interested => intent$.filter(identical(interested)),
  }
}

import { Action, SemanticTagConfig, State, Item, AppHistory } from '../interfaces'

export default class ToggleSemanticTagAction extends Action {
  prevItem: Item
  addOrRemove: 'add' | 'remove'

  constructor(readonly tagConfig: SemanticTagConfig) {
    super()
  }

  prepare(h: AppHistory) {
    this.prevItem = h.state.sitem()
    this.addOrRemove = this.prevItem.tags.has(this.tagConfig.name) ? 'remove' : 'add'
    return h
  }

  next(state: State) {
    const item = state.sitem()
    const tagName = this.tagConfig.name
    const updatedItem = item.tags.has(tagName)
      ? // Remove tag
        item.update('tags', tags => tags.remove(tagName))
      : // Add tag and apply the styles
        item.update('tags', tags => tags.add(tagName)).merge(this.tagConfig.styles)
    return state.setIn(['items', item.id], updatedItem)
  }

  prev(state: State) {
    return state.set('items', state.items.set(this.prevItem.id, this.prevItem))
  }

  getMessage() {
    const op = this.addOrRemove === 'add' ? 'Add' : 'Remove'
    return `${op} tag. item=${this.prevItem.id}, tag=${this.tagConfig.name}`
  }
}

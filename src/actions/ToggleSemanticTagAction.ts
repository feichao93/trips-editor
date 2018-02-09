import { Action, SemanticTagConfig, Sel, State } from '../interfaces'

export default class ToggleSemanticTagAction extends Action {
  constructor(readonly tagConfig: SemanticTagConfig) {
    super()
  }

  nextState(state: State, sel: Sel) {
    const item = sel.item(state)
    const tagName = this.tagConfig.name
    const updatedItem = item.tags.has(tagName)
      ? // Remove tag
        item.update('tags', tags => tags.remove(tagName))
      : // Add tag and apply the styles
        item.update('tags', tags => tags.add(tagName)).merge(this.tagConfig.styles)
    return state.setIn(['items', item.id], updatedItem)
  }
}

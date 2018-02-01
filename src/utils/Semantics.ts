import { Record, Set } from 'immutable'

const SemanticsRecord = Record({
  tags: Set<string>(),
  // TODO other semantic information
})

export default class Semantics extends SemanticsRecord {}

import { describe, it, expect } from 'vitest'
import {
  createInitialSplit,
  getAllLeaves,
  findLeaf,
  splitLeaf,
  removeLeaf,
  updateBranchSizes,
  navigatePane,
  serializeSplitTree,
  deserializeSplitTree
} from './split-tree'
import type { SplitPaneLeaf } from '@shared/types'

describe('split-tree utils', () => {
  it('creates initial leaf and lists leaves', () => {
    const root = createInitialSplit('pane-1', 'ch-1', undefined)
    expect(root.type).toBe('leaf')
    expect(root.id).toBe('pane-1')
    expect(root.channelId).toBe('ch-1')

    const leaves = getAllLeaves(root)
    expect(leaves.length).toBe(1)
    expect(leaves[0].id).toBe('pane-1')
    expect(findLeaf(root, 'pane-1')).toEqual(root)
    expect(findLeaf(root, 'non-existent')).toBeNull()
  })

  it('splits leaf into two and returns both leaves in order', () => {
    const root = createInitialSplit('p1', 'ch-1')
    const newLeaf: SplitPaneLeaf = { type: 'leaf', id: 'p2', channelId: 'ch-2' }

    const splitTree = splitLeaf(root, 'p1', 'horizontal', newLeaf)
    expect(splitTree.type).toBe('split')
    if (splitTree.type === 'split') {
      expect(splitTree.direction).toBe('horizontal')
      expect(splitTree.children[0].id).toBe('p1')
      expect(splitTree.children[1].id).toBe('p2')
    }

    const leaves = getAllLeaves(splitTree)
    expect(leaves.map((l) => l.id)).toEqual(['p1', 'p2'])
  })

  it('supports 4-terminal splits (split horizontal then each vertically)', () => {
    const root = createInitialSplit('p1')
    const s2 = splitLeaf(root, 'p1', 'horizontal', { type: 'leaf', id: 'p2' })
    const s3 = splitLeaf(s2, 'p1', 'vertical', { type: 'leaf', id: 'p3' })
    const s4 = splitLeaf(s3, 'p2', 'vertical', { type: 'leaf', id: 'p4' })

    const leaves = getAllLeaves(s4)
    expect(leaves.length).toBe(4)
    expect(leaves.map((l) => l.id)).toEqual(['p1', 'p3', 'p2', 'p4'])
  })

  it('removes a leaf and collapses parent branch', () => {
    const root = createInitialSplit('p1')
    const splitTree = splitLeaf(root, 'p1', 'horizontal', { type: 'leaf', id: 'p2' })

    // Closing p2 should leave p1 as the root leaf
    const remaining = removeLeaf(splitTree, 'p2')
    expect(remaining).not.toBeNull()
    expect(remaining?.type).toBe('leaf')
    expect(remaining?.id).toBe('p1')
  })

  it('returns null when closing the only leaf', () => {
    const root = createInitialSplit('p1')
    const remaining = removeLeaf(root, 'p1')
    expect(remaining).toBeNull()
  })

  it('updates branch sizes correctly', () => {
    const root = createInitialSplit('p1')
    const splitTree = splitLeaf(root, 'p1', 'horizontal', { type: 'leaf', id: 'p2' })
    if (splitTree.type !== 'split') throw new Error('Must be split')

    const branchId = splitTree.id
    const updated = updateBranchSizes(splitTree, branchId, [30, 70])
    if (updated.type === 'split') {
      expect(updated.sizes).toEqual([30, 70])
    }
  })

  it('navigates between panes circularly', () => {
    const root = createInitialSplit('p1')
    const s2 = splitLeaf(root, 'p1', 'horizontal', { type: 'leaf', id: 'p2' })
    const s3 = splitLeaf(s2, 'p2', 'horizontal', { type: 'leaf', id: 'p3' })

    expect(navigatePane(s3, 'p1', 'right')).toBe('p2')
    expect(navigatePane(s3, 'p2', 'right')).toBe('p3')
    expect(navigatePane(s3, 'p3', 'right')).toBe('p1') // wrap around
    expect(navigatePane(s3, 'p1', 'left')).toBe('p3') // wrap backwards
  })

  it('serializes and deserializes cleanly', () => {
    const root = createInitialSplit('p1', 'ch-1')
    const splitTree = splitLeaf(root, 'p1', 'horizontal', {
      type: 'leaf',
      id: 'p2',
      channelId: 'ch-2'
    })

    const json = serializeSplitTree(splitTree)
    const restored = deserializeSplitTree(json)

    expect(restored).not.toBeNull()
    expect(restored?.type).toBe('split')
    if (restored && restored.type === 'split') {
      expect(restored.children[0].id).toBe('p1')
      expect(restored.children[1].id).toBe('p2')
    }
  })
})

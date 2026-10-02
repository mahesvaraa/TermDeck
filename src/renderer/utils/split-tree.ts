import type { SplitNode, SplitPaneLeaf, SplitBranchNode, SplitDirection } from '@shared/types'

/**
 * Create initial single leaf split node.
 */
export function createInitialSplit(
  leafId: string,
  channelId?: string,
  terminalId?: string
): SplitPaneLeaf {
  return {
    type: 'leaf',
    id: leafId,
    channelId,
    terminalId
  }
}

/**
 * Recursively find all leaves in the tree in visual order.
 */
export function getAllLeaves(root: SplitNode): SplitPaneLeaf[] {
  if (root.type === 'leaf') {
    return [root]
  }
  return [...getAllLeaves(root.children[0]), ...getAllLeaves(root.children[1])]
}

/**
 * Find a specific leaf node by its pane id.
 */
export function findLeaf(root: SplitNode, paneId: string): SplitPaneLeaf | null {
  if (root.type === 'leaf') {
    return root.id === paneId ? root : null
  }
  return findLeaf(root.children[0], paneId) || findLeaf(root.children[1], paneId)
}

/**
 * Replace a leaf with a new split branch containing the original leaf and a new leaf.
 */
export function splitLeaf(
  root: SplitNode,
  targetPaneId: string,
  direction: SplitDirection,
  newLeaf: SplitPaneLeaf
): SplitNode {
  if (root.type === 'leaf') {
    if (root.id === targetPaneId) {
      const branch: SplitBranchNode = {
        type: 'split',
        id: `split-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        direction,
        children: [{ ...root }, newLeaf],
        sizes: [50, 50]
      }
      return branch
    }
    return root
  }

  return {
    ...root,
    children: [
      splitLeaf(root.children[0], targetPaneId, direction, newLeaf),
      splitLeaf(root.children[1], targetPaneId, direction, newLeaf)
    ]
  }
}

/**
 * Remove a leaf by its pane id.
 * Returns null if the root leaf was removed (no remaining panes).
 * If a branch child is removed, the other sibling replaces the branch.
 */
export function removeLeaf(root: SplitNode, targetPaneId: string): SplitNode | null {
  if (root.type === 'leaf') {
    return root.id === targetPaneId ? null : root
  }

  const [left, right] = root.children

  // Check if left child is the target
  if (left.type === 'leaf' && left.id === targetPaneId) {
    return right
  }

  // Check if right child is the target
  if (right.type === 'leaf' && right.id === targetPaneId) {
    return left
  }

  const newLeft = removeLeaf(left, targetPaneId)
  const newRight = removeLeaf(right, targetPaneId)

  if (!newLeft) return newRight
  if (!newRight) return newLeft

  return {
    ...root,
    children: [newLeft, newRight]
  }
}

/**
 * Update the resize sizes of a branch node.
 */
export function updateBranchSizes(
  root: SplitNode,
  branchId: string,
  newSizes: [number, number]
): SplitNode {
  if (root.type === 'leaf') {
    return root
  }

  if (root.id === branchId) {
    return {
      ...root,
      sizes: newSizes
    }
  }

  return {
    ...root,
    children: [
      updateBranchSizes(root.children[0], branchId, newSizes),
      updateBranchSizes(root.children[1], branchId, newSizes)
    ]
  }
}

/**
 * Navigate to next/prev pane by keyboard direction.
 */
export function navigatePane(
  root: SplitNode,
  currentPaneId: string,
  direction: 'up' | 'down' | 'left' | 'right'
): string {
  const leaves = getAllLeaves(root)
  if (leaves.length <= 1) return currentPaneId

  const currIdx = leaves.findIndex((l) => l.id === currentPaneId)
  if (currIdx === -1) return leaves[0].id

  let nextIdx = currIdx
  if (direction === 'right' || direction === 'down') {
    nextIdx = (currIdx + 1) % leaves.length
  } else {
    nextIdx = (currIdx - 1 + leaves.length) % leaves.length
  }

  return leaves[nextIdx].id
}

/**
 * Serialize a split tree to JSON.
 */
export function serializeSplitTree(root: SplitNode): string {
  return JSON.stringify(root)
}

/**
 * Deserialize a split tree from JSON with structure validation.
 */
export function deserializeSplitTree(json: string): SplitNode | null {
  try {
    const parsed = JSON.parse(json)
    if (!parsed || (parsed.type !== 'leaf' && parsed.type !== 'split')) {
      return null
    }
    return parsed as SplitNode
  } catch {
    return null
  }
}

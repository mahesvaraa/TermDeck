/**
 * Extract unique variable names from snippet command template like {{varName}}
 */
export function extractSnippetVariables(template: string): string[] {
  const regex = /\{\{([a-zA-Z0-9_-]+)\}\}/g
  const matches = new Set<string>()
  let match: RegExpExecArray | null

  while ((match = regex.exec(template)) !== null) {
    matches.add(match[1])
  }

  return Array.from(matches)
}

/**
 * Replace all {{varName}} occurrences with provided values.
 */
export function interpolateSnippet(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (_, varName) => {
    return values[varName] !== undefined ? values[varName] : `{{${varName}}}`
  })
}

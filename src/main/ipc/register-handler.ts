import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import {
  IpcInvokeContracts,
  type IpcInvokeChannel,
  type IpcInput,
  type IpcOutput
} from '@shared/ipc-contract'

/**
 * Registers a strongly typed IPC handler with input validation using Zod.
 */
export function registerHandler<C extends IpcInvokeChannel>(
  channel: C,
  handler: (input: IpcInput<C>, event: IpcMainInvokeEvent) => Promise<IpcOutput<C>> | IpcOutput<C>
): void {
  ipcMain.handle(channel, async (event, rawInput) => {
    const contract = IpcInvokeContracts[channel]
    const parsed = contract.input.safeParse(rawInput)

    if (!parsed.success) {
      const issueDetails = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ')
      throw new Error(`[IPC Error] Invalid input for channel "${channel}": ${issueDetails}`)
    }

    const output = await handler(parsed.data as IpcInput<C>, event)
    const outputParsed = contract.output.safeParse(output)
    if (!outputParsed.success) {
      const issueDetails = outputParsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ')
      throw new Error(`[IPC Error] Invalid output from channel "${channel}": ${issueDetails}`)
    }

    return outputParsed.data
  })
}

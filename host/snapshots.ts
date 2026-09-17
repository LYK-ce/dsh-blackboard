/**
 * 画板快照的按需拉取账本。
 *
 * host 没有 canvas，PNG 只能由浏览器里的面板产出，所以模板是"拉"而不是"推"：
 * 工具发起一次请求 → 面板下一次轮询从场景响应里看到它 → 出图 POST 回来。
 * 这里只管记账与超时，不认识画板本身。
 */

/** 一次等待中的出图请求。 */
interface Pending {
  readonly id: string
  readonly resolve: (png: Uint8Array) => void
  readonly reject: (error: Error) => void
}

/** 每个会话最多一次等待中的请求；新请求把旧的挤掉。 */
export class SnapshotRequests {
  private readonly pending = new Map<string, Pending>()

  /**
   * 发起一次出图请求并等待面板交图。
   * @param sessionId - 目标会话。
   * @param timeoutMs - 等待上限，毫秒（面板没开或没响应时走这条）。
   * @param signal - 调用方的取消信号。
   * @returns 面板交回的 PNG 字节。
   * @throws 超时、被取消，或被同一会话的后一次请求挤掉时抛错。
   */
  request(sessionId: string, timeoutMs: number, signal?: AbortSignal): Promise<Uint8Array> {
    // 同一会话只保留最新一次：旧的立刻失败，免得它一直占着面板的注意力。
    this.pending.get(sessionId)?.reject(new Error('blackboard: a newer snapshot request replaced this one'))

    return new Promise<Uint8Array>((resolve, reject) => {
      const id = crypto.randomUUID()
      let done = false
      let timer: ReturnType<typeof setTimeout> | undefined

      const finish = (png: Uint8Array | undefined, error?: Error): void => {
        if (done) return
        done = true
        if (timer !== undefined) clearTimeout(timer)
        signal?.removeEventListener('abort', onAbort)
        if (this.pending.get(sessionId)?.id === id) this.pending.delete(sessionId)
        if (png !== undefined) resolve(png)
        else reject(error ?? new Error('blackboard: the snapshot request was dropped'))
      }

      const onAbort = (): void => { finish(undefined, new Error('blackboard: the snapshot request was cancelled')) }

      timer = setTimeout(() => {
        finish(undefined, new Error(
          `blackboard: no board panel answered within ${timeoutMs}ms; open the board in the right sidebar and retry`,
        ))
      }, timeoutMs)
      signal?.addEventListener('abort', onAbort, { once: true })
      this.pending.set(sessionId, { id, resolve: (png) => { finish(png) }, reject: (error) => { finish(undefined, error) } })
      if (signal?.aborted === true) onAbort()
    })
  }

  /**
   * 面板交回一张图。
   * @param sessionId - 会话。
   * @param requestId - 面板在场景响应里看到的请求 id。
   * @param png - PNG 原始字节。
   * @returns 是否被这次请求收下；id 对不上（过期或伪造）时为 false。
   */
  deliver(sessionId: string, requestId: string, png: Uint8Array): boolean {
    const pending = this.pending.get(sessionId)
    if (pending === undefined || pending.id !== requestId) return false
    pending.resolve(png)
    return true
  }

  /**
   * 该会话当前在等哪一次请求；场景响应把它带给轮询的面板。
   * @param sessionId - 会话。
   * @returns 请求 id，没有等待中的请求时 null。
   */
  outstanding(sessionId: string): string | null {
    return this.pending.get(sessionId)?.id ?? null
  }

  /**
   * 结束所有等待中的请求（插件卸载时）。
   * @returns 无。
   */
  dispose(): void {
    for (const pending of [...this.pending.values()]) {
      pending.reject(new Error('blackboard: the board plugin is unloading'))
    }
    this.pending.clear()
  }
}

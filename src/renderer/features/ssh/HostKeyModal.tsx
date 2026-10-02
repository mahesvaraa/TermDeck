import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { HostKeyPrompt } from '@shared/types'

interface HostKeyModalProps {
  prompt: HostKeyPrompt
  onResolve: (decision: { trustOnce: boolean; remember: boolean }) => void
  onCancel: () => void
}

export function HostKeyModal({ prompt, onResolve, onCancel }: HostKeyModalProps): JSX.Element {
  const isMismatch = prompt.status === 'mismatch'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs select-none">
      <div className="bg-panel border border-line rounded-lg w-[500px] max-w-[95vw] shadow-2xl overflow-hidden font-sans flex flex-col text-tx">
        {/* Header */}
        <div
          className={`flex items-center gap-2.5 px-5 py-3.5 border-b ${
            isMismatch ? 'bg-err/15 border-err/30 text-err' : 'bg-panel2 border-line text-tx'
          }`}
        >
          {isMismatch ? (
            <ShieldAlert className="w-5 h-5 text-err flex-none" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-acc flex-none" />
          )}
          <h2 className="text-sm font-semibold">
            {isMismatch ? 'Внимание: ключ хоста изменился!' : 'Проверка подлинности сервера'}
          </h2>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {isMismatch ? (
            <div className="p-3 rounded bg-err/15 border border-err/30 text-err space-y-2">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 flex-none" />
                <span>Возможна атака типа «Man-in-the-Middle» (MitM)!</span>
              </div>
              <p className="leading-relaxed">
                Ключ хоста{' '}
                <strong>
                  {prompt.host}:{prompt.port}
                </strong>{' '}
                не совпадает с ключом, сохранённым в known_hosts приложения. Это может означать
                смену ключа администратором или перехват сетевого трафика.
              </p>
            </div>
          ) : (
            <p className="text-mut leading-relaxed">
              Вы подключаетесь к хосту{' '}
              <strong>
                {prompt.host}:{prompt.port}
              </strong>{' '}
              впервые. Убедитесь, что отпечаток публичного ключа (fingerprint) совпадает с
              предоставленным администратором сервера:
            </p>
          )}

          {/* Fingerprint Box */}
          <div className="space-y-1">
            <span className="text-mut text-[11px] font-medium">Отпечаток ключа (SHA-256):</span>
            <div className="p-2.5 rounded bg-bg border border-line font-mono text-xs select-all text-acc break-all">
              {prompt.fingerprintSha256}
            </div>
          </div>

          <div className="text-mut text-[11px]">
            Тип ключа: <span className="text-tx font-mono">{prompt.keyType}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onCancel}
              className={`py-1.5 px-3 rounded border text-xs transition-colors ${
                isMismatch
                  ? 'bg-err hover:bg-err/90 text-white font-medium border-err'
                  : 'bg-panel2 hover:border-mut text-tx border-line'
              }`}
            >
              {isMismatch ? 'Отмена (Рекомендуется)' : 'Отмена'}
            </button>

            {!isMismatch && (
              <>
                <button
                  type="button"
                  onClick={() => onResolve({ trustOnce: true, remember: false })}
                  className="py-1.5 px-3 rounded border border-line bg-panel2 text-tx hover:border-acc text-xs transition-colors"
                >
                  Доверять один раз
                </button>
                <button
                  type="button"
                  onClick={() => onResolve({ trustOnce: true, remember: true })}
                  className="py-1.5 px-3.5 rounded bg-acc hover:bg-acc/90 text-white font-medium text-xs transition-colors"
                >
                  Сохранить и подключиться
                </button>
              </>
            )}

            {isMismatch && (
              <button
                type="button"
                onClick={() => onResolve({ trustOnce: true, remember: true })}
                className="py-1.5 px-3 rounded border border-err/50 text-err hover:bg-err/20 text-xs transition-colors"
              >
                Игнорировать и перезаписать
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

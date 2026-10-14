interface Props {
  onSave: () => void
  onCancel: () => void
  saveLabel: string
  cancelLabel?: string
  saving?: boolean
  disabled?: boolean
}

export default function FormActions({ onSave, onCancel, saveLabel, cancelLabel = 'Annulla', saving = false, disabled = false }: Props) {
  return <div className="grid grid-cols-[auto_1fr] gap-3 pt-1">
    <button type="button" onClick={onCancel} disabled={saving}
      className="rounded-xl border border-gray-700 px-4 py-3 font-medium text-gray-400 hover:bg-gray-700 disabled:opacity-40">{cancelLabel}</button>
    <button type="button" onClick={onSave} disabled={disabled || saving}
      className="rounded-xl bg-primary-500 px-4 py-3 font-semibold hover:bg-primary-400 disabled:opacity-40">
      {saving ? 'Salvataggio…' : saveLabel}
    </button>
  </div>
}

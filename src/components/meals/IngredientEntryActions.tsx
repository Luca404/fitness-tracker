interface Props {
  onScan: () => void
  onPhoto: () => void
  onManual: () => void
  onSearch?: () => void
  disabled?: boolean
}

export default function IngredientEntryActions({ onScan, onPhoto, onManual, onSearch, disabled = false }: Props) {
  const actions = [
    ...(onSearch ? [{ label: '🔍 Cerca alimento base', onClick: onSearch }] : []),
    { label: '📷 Scansiona codice a barre', onClick: onScan, tour: 'ingredient-barcode' },
    { label: '📸 Foto confezione o etichetta', onClick: onPhoto, tour: 'ingredient-photo' },
    { label: '✏️ Inserisci a mano', onClick: onManual, tour: 'ingredient-manual' },
  ]
  return <div data-tour="ingredient-methods" className="grid grid-cols-2 gap-2">
    {actions.map(action => <button key={action.label} data-tour={'tour' in action ? action.tour : undefined} type="button" onClick={action.onClick} disabled={disabled}
      className="rounded-xl border border-gray-700 bg-gray-800/50 px-3 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-40">
      {action.label}
    </button>)}
  </div>
}

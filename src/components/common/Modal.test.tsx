import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Modal from './Modal'

describe('Modal', () => {
  afterEach(cleanup)

  it('exposes dialog semantics and closes with Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Prova">
        <button type="button">Azione</button>
      </Modal>
    )

    const dialog = screen.getByRole('dialog', { name: 'Prova' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('mounts a full-screen modal outside the page scroller', () => {
    const onClose = vi.fn()
    render(
      <main className="overflow-y-auto">
        <Modal open onClose={onClose} fullScreenOnMobile>Contenuto</Modal>
      </main>
    )

    const dialog = screen.getByRole('dialog', { name: 'Finestra di dialogo' })
    const overlay = dialog.parentElement
    expect(overlay?.parentElement).toBe(document.body)
    expect(overlay?.className).toContain('h-[100dvh]')
    expect(overlay?.className).toContain('bg-gray-800')
    expect(dialog.className).toContain('h-[100dvh]')
    expect(dialog.className).toContain('pt-[max(2rem,env(safe-area-inset-top))]')
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('keeps compact flows as a bottom sheet', () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose}>Nuova registrazione</Modal>)

    const dialog = screen.getByRole('dialog')
    expect(dialog.parentElement?.className).toContain('items-end')
    expect(dialog.className).toContain('max-h-[92dvh]')
    expect(dialog.className).not.toContain('h-[100dvh]')
    fireEvent.click(dialog.previousElementSibling as Element)
    expect(onClose).toHaveBeenCalledOnce()
  })
})

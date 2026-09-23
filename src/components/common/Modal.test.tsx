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

  it('mounts outside the page scroller and fills the mobile viewport', () => {
    const onClose = vi.fn()
    render(
      <main className="overflow-y-auto">
        <Modal open onClose={onClose}>Contenuto</Modal>
      </main>
    )

    const dialog = screen.getByRole('dialog', { name: 'Finestra di dialogo' })
    const overlay = dialog.parentElement
    expect(overlay?.parentElement).toBe(document.body)
    expect(overlay?.className).toContain('h-[100dvh]')
    expect(overlay?.className).toContain('bg-gray-800')
    expect(dialog.className).toContain('h-full')
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

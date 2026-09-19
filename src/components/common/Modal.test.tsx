import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Modal from './Modal'

describe('Modal', () => {
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

  it('can cover the full mobile viewport', () => {
    render(
      <Modal open onClose={() => {}} fullScreenOnMobile>
        Contenuto
      </Modal>
    )

    expect(screen.getByRole('dialog', { name: 'Finestra di dialogo' }).className).toContain('h-[100dvh]')
  })
})

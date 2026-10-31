import type { ReactNode } from 'react'

export default function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return <div className="page-header">
    <div><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div>
    {children && <div className="page-header-control">{children}</div>}
  </div>
}

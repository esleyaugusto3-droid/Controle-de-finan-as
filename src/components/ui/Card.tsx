import type React from 'react'
import './ui.css'

export function Card(props: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="card">
      {(props.title || props.right) && (
        <div className="cardHeader">
          {props.title ? <h2 className="cardTitle">{props.title}</h2> : <div />}
          {props.right ? <div className="cardRight">{props.right}</div> : null}
        </div>
      )}
      <div className="cardBody">{props.children}</div>
    </section>
  )
}

import { EditorialMenuRow } from '@/components/editorial/EditorialMenuRow'

export default function TalkItOutPage() {
  return (
    <div className="np-ed-placeholder">
      <EditorialMenuRow />
      <hr className="np-rule mb-6" />
      <p className="np-cat np-cat-left">COMING SOON</p>
      <h1 className="np-ed-placeholder-title">Talk It Out</h1>
      <p className="np-ed-placeholder-dek">
        Deliberation, threads, and roundtable-style discussion will gather here. Your Daily edition still
        surfaces what needs a reply today.
      </p>
    </div>
  )
}

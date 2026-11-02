import { Panel, SmallTitle } from '../ui'

/** Midlertidig: skjermen er under ombygging til levende data. */
export function Placeholder({ name }: { name: string }) {
  return <Panel className="p-5"><SmallTitle title={name} copy="Bygges om til levende data." /></Panel>
}

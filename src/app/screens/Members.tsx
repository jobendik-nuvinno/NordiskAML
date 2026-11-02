import { useState, useSyncExternalStore } from 'react'
import {
  ALL_ROLES, CASE_ROLES, changeRole, deactivateMember, grantSupportAccess, inviteMember, MAX_SUPPORT_HOURS, membersStore,
  reactivateMember, readMemberAudit, readMembers, readSupportGrants, revokeSupportAccess, ROLE_LABEL, TENANT,
  type GrantStatus, type Member, type MemberRole, type MemberStatus,
} from '../../api/membersServer'
import { useApp } from '../context'
import { fmt, useCall } from '../hooks'
import { Badge, btn, Callout, field, fieldLabel, Label, Metric, Panel, SmallTitle, Table, TestPanel, type Tone } from '../ui'

const STATUS: Record<MemberStatus, [Tone, string]> = { aktiv: ['green', 'Aktiv'], invitert: ['blue', 'Invitert'], deaktivert: ['red', 'Deaktivert'] }
const GRANT: Record<GrantStatus, [Tone, string]> = { aktiv: ['amber', 'Aktiv'], 'trukket tilbake': ['neutral', 'Trukket tilbake'], 'utløpt': ['neutral', 'Utløpt'] }
const roleTone = (r: MemberRole): Tone => r === 'revisor' ? 'amber' : r === 'bedriftsadministrator' ? 'blue' : r === 'hvitvaskingsansvarlig' || r === 'stedfortreder' ? 'red' : 'green'
const pct = (n: number, d: number) => d ? `${Math.round((n / d) * 100)} %` : '–'

/** Brukere, roller og SSO (design «Members», S13). Bedriftsadministrator styrer medlemskap i egen virksomhet. */
export function MembersScreen() {
  useSyncExternalStore(membersStore.subscribe, membersStore.getVersion, membersStore.getVersion)
  const { actor } = useApp()
  const { busy, run } = useCall()
  const [editing, setEditing] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const members = readMembers()
  const active = members.filter(m => m.status === 'aktiv')
  const invited = members.filter(m => m.status === 'invitert')
  const mfa = active.filter(m => m.mfa).length
  const me = members.find(m => m.name === actor)

  return (
    <div className="grid gap-5 2xl:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Aktive brukere" value={String(active.length)} help={`${members.filter(m => m.status === 'deaktivert').length} deaktivert`} tone="green" />
          <Metric label="Invitert" value={String(invited.length)} help="Venter på første innlogging" tone={invited.length ? 'blue' : 'neutral'} />
          <Metric label="MFA-dekning" value={pct(mfa, active.length)} help={`${mfa} av ${active.length} aktive`} tone={mfa === active.length ? 'green' : 'amber'} />
          <Metric label="SSO" value="Entra ID" help="Påkrevd for alle medlemmer" tone="blue" />
        </div>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8ED] px-5 py-4">
            <SmallTitle title="Medlemskap og faglig delegasjon" copy="Rolle, virkeområde og utløp kontrolleres ved hver sensitiv operasjon." />
            <button type="button" onClick={() => setInviting(v => !v)} className="bg-[#176F61] px-3.5 py-2 text-[11px] font-bold text-white">{inviting ? 'Lukk invitasjon' : 'Inviter bruker'}</button>
          </div>
          {inviting ? <InviteForm actor={actor} busy={busy} run={run} done={() => setInviting(false)} /> : null}
          <Table
            headers={['Medlem', 'Roller', 'Status', 'SSO / MFA', 'Siste innlogging', 'Utløp', 'Handling']}
            rows={members.map(m => [
              <span><span className="block">{m.name}{m.name === actor ? <span className="ml-1.5 text-[10px] font-normal text-[#8692A1]">(deg)</span> : null}</span><small className="block text-[10px] font-normal text-[#718096]">{m.email}</small></span>,
              <span className="flex flex-wrap gap-1">{m.roles.map(r => <Badge key={r} tone={roleTone(r)}>{ROLE_LABEL[r]}</Badge>)}</span>,
              <Badge tone={STATUS[m.status][0]}>{STATUS[m.status][1]}</Badge>,
              <span className="text-[11px]">{m.sso} · {m.mfa ? 'MFA' : <b className="text-[#A2661A]">MFA ikke satt opp</b>}</span>,
              <span className="text-[11px]">{m.status === 'invitert' && !m.lastLogin ? 'Ikke logget inn' : fmt(m.lastLogin)}</span>,
              <span className="text-[11px]">{m.accessExpires ? new Date(m.accessExpires).toLocaleDateString('nb-NO') : 'Ingen'}</span>,
              <span className="flex flex-wrap gap-3 whitespace-nowrap">
                {m.status !== 'deaktivert' ? <button type="button" disabled={busy} onClick={() => setEditing(editing === m.id ? null : m.id)} className="text-[11px] font-bold text-[#176B5B]">Endre rolle</button> : null}
                {m.status === 'deaktivert'
                  ? <button type="button" disabled={busy} onClick={() => run(() => reactivateMember(actor, m.id), `${m.name} er reaktivert. Ny innlogging med SSO og MFA kreves.`)} className="text-[11px] font-bold text-[#176B5B]">Reaktiver</button>
                  : <button type="button" disabled={busy} onClick={() => run(() => deactivateMember(actor, m.id), `Tilgang trukket tilbake for ${m.name}. Aktive sesjoner er avsluttet.`)} className="text-[11px] font-bold text-[#963531]">Deaktiver</button>}
              </span>,
            ])}
          />
          {editing ? <RoleEditor key={editing} member={members.find(m => m.id === editing)!} self={editing === me?.id} actor={actor} busy={busy} run={run} done={() => setEditing(null)} /> : null}
        </Panel>

        <Panel>
          <div className="border-b border-[#E2E8ED] px-5 py-4"><SmallTitle title="Tilgangslogg" copy={`Invitasjon, rolleendring, deaktivering og supporttilgang i ${TENANT}, med aktør og tidspunkt.`} /></div>
          <Table headers={['Tidspunkt', 'Handling', 'Utført av', 'Objekt', 'Detalj']} rows={readMemberAudit().slice(0, 12).map(e => [fmt(e.at), e.action, e.actor, e.target, <span className="text-[11px]">{e.detail}</span>])} />
        </Panel>
      </div>

      <aside className="space-y-5">
        <Panel className="p-5">
          <SmallTitle title="Arbeidsdeling" copy="Faglig rolle er en underrettighet innenfor Bruker, ikke en fjerde hovedrolle." />
          <div className="mt-4 space-y-2">
            {[['Saksbehandler', 'Starter kontroll og avklarer funn'], ['Godkjenner', 'Beslutter innen delegasjon'], ['AML-ansvarlig', 'Vurderer mistanke og rapport'], ['Revisor', 'Autorisert lesing med utløp']].map(row => (
              <div key={row[0]} className="border border-[#E2E8ED] p-3 text-[11px]"><b className="block text-[#34465A]">{row[0]}</b><span className="mt-1 block text-[#718096]">{row[1]}</span></div>
            ))}
          </div>
          <button type="button" disabled={busy || !me} onClick={() => me && run(() => changeRole(actor, me.id, [...me.roles, 'godkjenner']))} className="mt-4 w-full border border-[#D5A9A6] bg-white px-3 py-2.5 text-[11px] font-bold text-[#963531]">Verifiser arbeidsdeling</button>
        </Panel>
        <SupportAccess actor={actor} busy={busy} run={run} />
        <TestPanel entries={['Deprovisjonering skal gjelde umiddelbart.', 'Revisor får kun autorisert, tidsavgrenset lesing.', 'MFA og SSO er tilgangskontroll - ikke KYC-bevis.', 'Virksomheten har alltid minst én aktiv hvitvaskingsansvarlig.']} />
      </aside>
    </div>
  )
}

type Run = ReturnType<typeof useCall>['run']

function InviteForm({ actor, busy, run, done }: { actor: string; busy: boolean; run: Run; done: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('saksbehandler')
  return (
    <form className="grid gap-3 border-b border-[#E2E8ED] bg-[#FBFCFD] px-5 py-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end" onSubmit={async e => {
      e.preventDefault()
      const r = await run(() => inviteMember(actor, { name, email, role }), `Invitasjon sendt til ${email.trim()} via Entra ID.`)
      if (r) { setName(''); setEmail(''); done() }
    }}>
      <div><label htmlFor="inv-name" className={fieldLabel}>Navn</label><input id="inv-name" className={field} value={name} onChange={e => setName(e.target.value)} /></div>
      <div><label htmlFor="inv-email" className={fieldLabel}>E-post (jobbkonto)</label><input id="inv-email" type="email" className={field} value={email} onChange={e => setEmail(e.target.value)} placeholder="navn@nordictrade.example" /></div>
      <div><label htmlFor="inv-role" className={fieldLabel}>Rolle</label>
        <select id="inv-role" className={field} value={role} onChange={e => setRole(e.target.value as MemberRole)}>
          {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select></div>
      <button type="submit" disabled={busy} className={btn.primary}>Send invitasjon</button>
    </form>
  )
}

function RoleEditor({ member, self, actor, busy, run, done }: { member: Member; self: boolean; actor: string; busy: boolean; run: Run; done: () => void }) {
  const [roles, setRoles] = useState<MemberRole[]>(member.roles)
  const toggle = (r: MemberRole) => setRoles(rs => rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r])
  return (
    <div className="border-t border-[#E2E8ED] bg-[#FBFCFD] px-5 py-4">
      <Label>Endre roller · {member.name}</Label>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {ALL_ROLES.map(r => (
          <label key={r} className="flex items-center gap-2 border border-[#E2E8ED] bg-white p-2.5 text-[11px] text-[#34465A]">
            <input type="checkbox" checked={roles.includes(r)} onChange={() => toggle(r)} />{ROLE_LABEL[r]}
          </label>
        ))}
      </div>
      {self ? <div className="mt-3"><Callout tone="amber">Du endrer din egen tilgang. Administrator kan ikke tildele seg selv saksroller.</Callout></div> : null}
      {roles.includes('revisor') && roles.some(r => CASE_ROLES.includes(r)) ? <div className="mt-3"><Callout tone="red">Revisor kan ikke kombineres med en saksrolle.</Callout></div> : null}
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy} className={btn.primary} onClick={async () => {
          const r = await run(() => changeRole(actor, member.id, roles), `Roller for ${member.name} er oppdatert og logget.`)
          if (r) done()
        }}>Lagre roller</button>
        <button type="button" className={btn.secondary} onClick={done}>Avbryt</button>
      </div>
    </div>
  )
}

function SupportAccess({ actor, busy, run }: { actor: string; busy: boolean; run: Run }) {
  const [reason, setReason] = useState('')
  const [hours, setHours] = useState(2)
  const grants = readSupportGrants()
  return (
    <Panel className="p-5">
      <SmallTitle title="Supporttilgang" copy={`Plattformsupport får kun tidsavgrenset tilgang med begrunnelse. Maks ${MAX_SUPPORT_HOURS} timer.`} />
      <form className="mt-4 space-y-3" onSubmit={async e => {
        e.preventDefault()
        const r = await run(() => grantSupportAccess(actor, reason, hours), `Supporttilgang gitt i ${hours} t. Utløper automatisk.`)
        if (r) setReason('')
      }}>
        <div><label htmlFor="sup-reason" className={fieldLabel}>Begrunnelse</label>
          <textarea id="sup-reason" rows={2} className={field} value={reason} onChange={e => setReason(e.target.value)} placeholder="F.eks. feilsøking av dokumentimport, henvendelse 4471" /></div>
        <div><label htmlFor="sup-hours" className={fieldLabel}>Varighet</label>
          <select id="sup-hours" className={field} value={hours} onChange={e => setHours(Number(e.target.value))}>
            {[1, 2, 4, 8].map(h => <option key={h} value={h}>{h} time{h === 1 ? '' : 'r'}</option>)}
          </select></div>
        <button type="submit" disabled={busy} className={btn.outlineGreen + ' w-full'}>Gi tidsavgrenset tilgang</button>
      </form>
      <div className="mt-4 space-y-2">
        {grants.length === 0 ? <div className="border border-dashed border-[#D6DDE5] p-3 text-[11px] text-[#718096]">Ingen supporttilgang er gitt.</div> : grants.map(g => (
          <div key={g.id} className="border border-[#E2E8ED] p-3 text-[11px]">
            <div className="flex items-center justify-between gap-2"><b className="text-[#34465A]">{g.requestedBy}</b><Badge tone={GRANT[g.status][0]}>{GRANT[g.status][1]}</Badge></div>
            <p className="mt-1 text-[#536478]">{g.reason}</p>
            <small className="mt-1 block text-[#718096]">Gitt av {g.grantedBy} · {g.status === 'trukket tilbake' ? `trukket tilbake ${fmt(g.revokedAt)}` : `utløper ${fmt(g.expiresAt)}`}</small>
            {g.status === 'aktiv' ? <button type="button" disabled={busy} onClick={() => run(() => revokeSupportAccess(actor, g.id), 'Supporttilgang trukket tilbake.')} className="mt-2 text-[11px] font-bold text-[#963531]">Trekk tilbake</button> : null}
          </div>
        ))}
      </div>
    </Panel>
  )
}

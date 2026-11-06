import { db } from "@/lib/db";
import { reviewKyc } from "@/app/actions/admin";
import { fmtDate } from "@/lib/format";

export default async function Kyc() {
  const list = await db.kycSubmission.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { user: true } });
  return (
    <div className="space-y-4">
      <h1 className="h1">Identity checks</h1>
      {list.length === 0 && <p className="text-muted">No pending checks.</p>}
      {list.map((k) => (
        <div key={k.id} className="card space-y-3">
          <div>
            <div className="font-bold">{k.user.fullName}</div>
            <div className="text-sm text-muted">
              {k.user.email} · born {k.dateOfBirth.toISOString().slice(0, 10)} · {k.nationality} · passport <span className="num">{k.passportNo}</span> · sent {fmtDate(k.createdAt, "en")}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <a href={`/api/files/${k.passportFile}`} target="_blank"><img src={`/api/files/${k.passportFile}`} alt="Passport" className="max-h-72 w-full rounded-xl border border-line object-contain" /></a>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <a href={`/api/files/${k.selfieFile}`} target="_blank"><img src={`/api/files/${k.selfieFile}`} alt="Selfie" className="max-h-72 w-full rounded-xl border border-line object-contain" /></a>
          </div>
          <p className="text-sm">Check: the name matches the account name, the face matches, the passport is not expired, the person is 18+.</p>
          <form action={reviewKyc} className="flex flex-wrap gap-2">
            <input type="hidden" name="id" value={k.id} />
            <input name="note" className="input flex-1" placeholder="Note (required for reject)" />
            <button name="decision" value="approve" className="btn-primary">Approve</button>
            <button name="decision" value="reject" className="btn-danger">Reject</button>
          </form>
        </div>
      ))}
    </div>
  );
}

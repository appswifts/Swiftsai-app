'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useToaster } from '@gitroom/react/toaster/toaster';

type WorkerConfig = {
  hermesEnabled: boolean;
  hermesBrandVoice: string;
  hermesGoals: string;
  hermesApprovalMode: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_SCHEDULE';
  hermesDailyPostLimit: number;
  service: { configured: boolean; status: string };
};

export function HermesWorkerSettings(): React.ReactNode {
  const fetch = useFetch();
  const toast = useToaster();
  const load = async () => (await fetch('/hermes/config')).json();
  const { data, mutate, isLoading } = useSWR<WorkerConfig>(
    '/hermes/config',
    load
  );
  const [form, setForm] = useState<WorkerConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [assignment, setAssignment] = useState('');
  const [run, setRun] = useState<{ run_id: string; status: string } | null>(
    null
  );

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading || !form) {
    return <div className="text-sm text-textItemBlur">Loading AI worker…</div>;
  }

  const update = <K extends keyof WorkerConfig>(
    key: K,
    value: WorkerConfig[K]
  ) => setForm((current) => (current ? { ...current, [key]: value } : current));

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch('/hermes/config', {
        method: 'POST',
        body: JSON.stringify({
          enabled: form.hermesEnabled,
          brandVoice: form.hermesBrandVoice,
          goals: form.hermesGoals,
          approvalMode: form.hermesApprovalMode,
          dailyPostLimit: form.hermesDailyPostLimit,
        }),
      });
      if (!response.ok) throw new Error();
      await mutate();
      toast.show('AI worker settings saved');
    } catch {
      toast.show('Could not save AI worker settings', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const testWorker = async () => {
    try {
      const response = await fetch('/hermes/runs', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ input: assignment }),
      });
      if (!response.ok) throw new Error();
      setRun(await response.json());
      setAssignment('');
      toast.show('Draft assignment sent to Hermes');
    } catch {
      toast.show('Hermes could not start this assignment', 'warning');
    }
  };

  const online =
    form.service.configured &&
    ['ok', 'ready', 'healthy'].includes(form.service.status);

  return (
    <div className="flex max-w-[900px] flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-newTableBorder bg-menuBg p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                online ? 'animate-pulse bg-green-500' : 'bg-yellow-500'
              }`}
            />
            Hermes AI Worker
          </div>
          <p className="mt-1 text-xs text-textItemBlur">
            {online
              ? 'The private Hermes service is online.'
              : 'The worker is safely disabled until the server service is configured.'}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.hermesEnabled}
            disabled={!form.service.configured}
            onChange={(event) => update('hermesEnabled', event.target.checked)}
          />
          Enable for this organization
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Brand voice</span>
          <textarea
            value={form.hermesBrandVoice || ''}
            onChange={(event) =>
              update('hermesBrandVoice', event.target.value)
            }
            maxLength={2000}
            className="min-h-[130px] rounded-lg border border-newTableBorder bg-newBgColorInner p-3"
            placeholder="Professional, warm, concise, confident…"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Business and campaign goals</span>
          <textarea
            value={form.hermesGoals || ''}
            onChange={(event) => update('hermesGoals', event.target.value)}
            maxLength={4000}
            className="min-h-[130px] rounded-lg border border-newTableBorder bg-newBgColorInner p-3"
            placeholder="Audience, offers, content pillars and objectives…"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Approval policy</span>
          <select
            value={form.hermesApprovalMode}
            onChange={(event) =>
              update(
                'hermesApprovalMode',
                event.target.value as WorkerConfig['hermesApprovalMode']
              )
            }
            className="h-11 rounded-lg border border-newTableBorder bg-newBgColorInner px-3"
          >
            <option value="DRAFT_ONLY">Draft only</option>
            <option value="REQUIRE_APPROVAL">Require approval</option>
            <option value="AUTO_SCHEDULE" disabled>
              Automatic scheduling — coming after safety review
            </option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Maximum posts per day</span>
          <input
            type="number"
            min={1}
            max={20}
            value={form.hermesDailyPostLimit}
            onChange={(event) =>
              update('hermesDailyPostLimit', Number(event.target.value))
            }
            className="h-11 rounded-lg border border-newTableBorder bg-newBgColorInner px-3"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-btnPrimary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save worker settings'}
        </button>
      </div>

      <div className="rounded-xl border border-newTableBorder bg-menuBg p-4">
        <h4 className="text-sm font-semibold">Controlled draft assignment</h4>
        <p className="mt-1 text-xs text-textItemBlur">
          This first release can create campaign plans and drafts. Publishing,
          scheduling and external actions remain blocked.
        </p>
        <textarea
          value={assignment}
          onChange={(event) => setAssignment(event.target.value)}
          maxLength={4000}
          className="mt-3 min-h-[100px] w-full rounded-lg border border-newTableBorder bg-newBgColorInner p-3 text-sm"
          placeholder="Create a seven-day campaign for our new service…"
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-textItemBlur">
            {run ? `Run ${run.run_id}: ${run.status}` : 'No active test run'}
          </span>
          <button
            type="button"
            disabled={
              !online ||
              !form.hermesEnabled ||
              assignment.trim().length === 0
            }
            onClick={testWorker}
            className="rounded-lg border border-newTableBorder px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            Send draft assignment
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { AthleteNav } from '@/components/AthleteNav';
import {
  ApiError,
  createPerformanceResult,
  getMe,
  listPerformanceDefinitions,
  type PerformanceTestDefinitionDto,
} from '@/lib/api';

function toIsoFromLocal(value: string): string {
  return new Date(value).toISOString();
}

export default function NewPerformanceResultPage() {
  const router = useRouter();
  const [definitions, setDefinitions] = useState<PerformanceTestDefinitionDto[]>([]);
  const [testCode, setTestCode] = useState('');
  const [numericValue, setNumericValue] = useState('');
  const [performedAt, setPerformedAt] = useState('');
  const [eventName, setEventName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await getMe();
        const defs = await listPerformanceDefinitions();
        if (cancelled) return;
        setDefinitions(defs);
        setTestCode(defs[0]?.code ?? '');
        setLoaded(true);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/sign-in');
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          router.replace('/app/athlete/onboarding');
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Unable to load tests.');
        setLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!testCode || !numericValue || !performedAt) {
      setError('Test, value, and date are required.');
      return;
    }
    const value = Number(numericValue);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a positive numeric value.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await createPerformanceResult({
        testCode,
        numericValue: value,
        performedAt: toIsoFromLocal(performedAt),
        eventName: eventName.trim() || null,
        locationName: locationName.trim() || null,
        notes: notes.trim() || null,
      });
      router.push('/app/athlete/performance');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save result.');
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <main className="wideMain">
        <div className="card">
          <p>Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="wideMain">
      <AthleteNav />
      <div className="sectionBlock">
        <p className="brand" style={{ margin: 0, fontSize: '1.25rem' }}>
          ScoutAI
        </p>
        <h1>Add performance result</h1>
        <p className="mutedNote">
          <Link href="/app/athlete/performance">Back to performance</Link>
        </p>
      </div>

      {definitions.length === 0 ? (
        <div className="sectionBlock">
          <p className="error">No performance tests are configured yet.</p>
          <Link href="/app/athlete/performance">Back</Link>
        </div>
      ) : (
        <form className="sectionBlock form" onSubmit={(e) => void handleSubmit(e)}>
          {error ? <p className="error">{error}</p> : null}
          <div className="formGrid">
            <label className="label">
              Test
              <select
                className="input"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                required
              >
                {definitions.map((def) => (
                  <option key={def.code} value={def.code}>
                    {def.name} ({def.unit})
                  </option>
                ))}
              </select>
            </label>

            <label className="label">
              Value
              <input
                className="input"
                type="number"
                step="any"
                min="0"
                value={numericValue}
                onChange={(e) => setNumericValue(e.target.value)}
                required
              />
            </label>

            <label className="label">
              Performed at
              <input
                className="input"
                type="datetime-local"
                value={performedAt}
                onChange={(e) => setPerformedAt(e.target.value)}
                required
              />
            </label>

            <label className="label">
              Event (optional)
              <input
                className="input"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              />
            </label>

            <label className="label">
              Location (optional)
              <input
                className="input"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </label>

            <label className="label" style={{ gridColumn: '1 / -1' }}>
              Notes (optional)
              <textarea
                className="input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          <div className="actions">
            <button type="submit" className="button buttonPrimary" disabled={busy}>
              {busy ? 'Saving…' : 'Save result'}
            </button>
            <Link className="button buttonSecondary" href="/app/athlete/performance">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EmptyState } from '@scoutai/ui';
import { AthleteNav } from '@/components/AthleteNav';
import {
  ApiError,
  getMe,
  listPerformanceBests,
  listPerformanceResults,
  type PerformanceResultDto,
  type PersonalBestDto,
} from '@/lib/api';

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return iso;
  }
}

export default function AthletePerformancePage() {
  const router = useRouter();
  const [bests, setBests] = useState<PersonalBestDto[] | null>(null);
  const [results, setResults] = useState<PerformanceResultDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await getMe();
        const [bestList, history] = await Promise.all([
          listPerformanceBests(),
          listPerformanceResults(),
        ]);
        if (cancelled) return;
        setBests(bestList);
        setResults(history);
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
        setError(err instanceof ApiError ? err.message : 'Unable to load performance.');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error && bests === null) {
    return (
      <main className="wideMain">
        <div className="card">
          <p className="error">{error}</p>
          <Link href="/app">Back to app</Link>
        </div>
      </main>
    );
  }

  if (bests === null) {
    return (
      <main className="wideMain">
        <div className="card">
          <p>Loading performance…</p>
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
        <h1>Performance</h1>
        <p className="mutedNote">
          Personal bests distinguish verified results from the best available self-reported value.
        </p>
        <div className="actions">
          <Link className="button buttonPrimary" href="/app/athlete/performance/new">
            Add result
          </Link>
        </div>
      </div>

      {error ? (
        <div className="sectionBlock">
          <p className="error">{error}</p>
        </div>
      ) : null}

      <div className="sectionBlock">
        <h2>Personal bests</h2>
        {bests.length === 0 ? (
          <EmptyState
            title="No tests available"
            description="Performance test definitions will appear here when configured."
          />
        ) : (
          <div className="bestGrid">
            {bests.map((best) => (
              <div key={best.testCode} className="bestCard">
                <h3>{best.testName}</h3>
                <p className="mutedNote" style={{ marginBottom: '0.5rem' }}>
                  {best.unit}
                  {best.lowerIsBetter ? ' · lower is better' : ''}
                </p>
                <ul className="metaList">
                  <li>
                    <span className="metaLabel">Verified best</span>
                    <span className="metaValue">
                      {best.bestVerified
                        ? `${best.bestVerified.numericValue} (${formatWhen(best.bestVerified.performedAt)})`
                        : 'None verified'}
                    </span>
                  </li>
                  <li>
                    <span className="metaLabel">Best available</span>
                    <span className="metaValue">
                      {best.bestAvailable
                        ? `${best.bestAvailable.numericValue} · ${best.bestAvailable.sourceLabel}`
                        : 'No result yet'}
                    </span>
                  </li>
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sectionBlock">
        <h2>History</h2>
        {results.length === 0 ? (
          <EmptyState
            title="No results yet"
            description="Log a performance test result to start your history."
          />
        ) : (
          <table className="dataTable">
            <thead>
              <tr>
                <th>Test</th>
                <th>Value</th>
                <th>Date</th>
                <th>Source</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.id}>
                  <td>{row.testName}</td>
                  <td>
                    {row.numericValue} {row.unit}
                  </td>
                  <td>{formatWhen(row.performedAt)}</td>
                  <td>{row.sourceLabel}</td>
                  <td>{row.verificationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import {
  ApiError,
  acceptGuardianInvite,
  getMe,
  inviteGuardian,
  listGuardianAthletes,
  listGuardianLinks,
  revokeGuardianLink,
  type AuthUser,
  type GuardianLink,
} from '@/lib/api';

export default function GuardiansPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [linkedAthletes, setLinkedAthletes] = useState<
    Array<{ link: GuardianLink; athlete: { id: string; displayName: string } }>
  >([]);
  const [guardianEmail, setGuardianEmail] = useState('guardian@scoutai.dev');
  const [relationshipType, setRelationshipType] = useState('parent');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [guardianLinks, athletes] = await Promise.all([
      listGuardianLinks(),
      listGuardianAthletes().catch(() => []),
    ]);
    setLinks(guardianLinks);
    setLinkedAthletes(athletes);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const me = await getMe();
        if (cancelled) return;
        setUser(me);
        await refresh();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/sign-in');
          return;
        }
        if (!cancelled) setError('Unable to load guardian links.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await inviteGuardian(guardianEmail, relationshipType);
      setMessage('Guardian invite created (pending acceptance).');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invite failed');
    }
  }

  async function handleAccept(id: string) {
    setError(null);
    try {
      await acceptGuardianInvite(id);
      setMessage('Guardian link activated.');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Accept failed');
    }
  }

  async function handleRevoke(id: string) {
    setError(null);
    try {
      await revokeGuardianLink(id);
      setMessage('Guardian link revoked.');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Revoke failed');
    }
  }

  if (loading) {
    return (
      <main>
        <div className="card">
          <p>Loading guardians…</p>
        </div>
      </main>
    );
  }

  const isAthlete = user?.roles.includes('ATHLETE');
  const isGuardian = user?.roles.includes('GUARDIAN');

  return (
    <main>
      <div className="card">
        <p className="brand">ScoutAI</p>
        <h1>Guardian links</h1>
        <p>Invitation and approval flow for athlete–guardian relationships.</p>

        {isAthlete ? (
          <section className="sectionBlock">
            <h2>Invite a guardian</h2>
            <form className="form" onSubmit={handleInvite}>
              <label className="label">
                Guardian email
                <input
                  className="input"
                  type="email"
                  required
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                />
              </label>
              <label className="label">
                Relationship
                <input
                  className="input"
                  required
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                />
              </label>
              <button className="button buttonPrimary" type="submit">
                Send invite
              </button>
            </form>
          </section>
        ) : null}

        {isGuardian && linkedAthletes.length > 0 ? (
          <section className="sectionBlock">
            <h2>Linked athletes</h2>
            <ul className="metaList">
              {linkedAthletes.map((entry) => (
                <li key={entry.link.id}>
                  <span className="metaLabel">{entry.athlete.displayName}</span>
                  <span className="metaValue">
                    <Link href={`/app/athletes/${entry.athlete.id}`}>Open</Link>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="sectionBlock">
          <h2>All links</h2>
          {links.length === 0 ? (
            <p>No guardian relationships yet.</p>
          ) : (
            <ul className="metaList">
              {links.map((link) => (
                <li key={link.id}>
                  <span className="metaLabel">
                    {link.relationshipType} · {link.status}
                  </span>
                  <span className="metaValue">
                    {link.status === 'PENDING' && isGuardian ? (
                      <button
                        className="button buttonPrimary"
                        type="button"
                        onClick={() => void handleAccept(link.id)}
                      >
                        Accept
                      </button>
                    ) : null}{' '}
                    {link.status !== 'REVOKED' ? (
                      <button
                        className="button buttonSecondary"
                        type="button"
                        onClick={() => void handleRevoke(link.id)}
                      >
                        Revoke
                      </button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="statusOk">{message}</p> : null}

        <div className="actions">
          <Link className="button buttonSecondary" href="/app">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

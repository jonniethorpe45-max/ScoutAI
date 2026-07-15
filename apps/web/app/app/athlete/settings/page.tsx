'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { StatusBadge } from '@scoutai/ui';
import { AthleteNav } from '@/components/AthleteNav';
import {
  ApiError,
  getCompleteness,
  getGuardianLinks,
  getMe,
  getMyAthlete,
  inviteGuardian,
  patchVisibility,
  publishAthlete,
  revokeGuardianInvite,
  unpublishAthlete,
  type AthleteOwnerView,
  type CompletenessResult,
  type GuardianLinkView,
} from '@/lib/api';

export default function AthleteSettingsPage() {
  const router = useRouter();
  const [athlete, setAthlete] = useState<AthleteOwnerView | null>(null);
  const [completeness, setCompleteness] = useState<CompletenessResult | null>(null);
  const [links, setLinks] = useState<GuardianLinkView[]>([]);
  const [visibility, setVisibility] = useState('PRIVATE');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [relationshipType, setRelationshipType] = useState('PARENT');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [profile, complete, guardianLinks] = await Promise.all([
      getMyAthlete(),
      getCompleteness(),
      getGuardianLinks(),
    ]);
    setAthlete(profile);
    setCompleteness(complete);
    setVisibility(profile.profileVisibility);
    setLinks(guardianLinks.asAthleteOwner);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await getMe();
        await refresh();
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/sign-in');
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          router.replace('/app/athlete/onboarding');
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Unable to load settings.');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleVisibility(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await patchVisibility({ profileVisibility: visibility });
      await refresh();
      setMessage('Visibility updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update visibility.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await publishAthlete();
      await refresh();
      setMessage('Passport published.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to publish.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnpublish() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await unpublishAthlete();
      await refresh();
      setMessage('Passport unpublished.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to unpublish.');
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await inviteGuardian({
        guardianEmail: guardianEmail.trim(),
        relationshipType,
      });
      setGuardianEmail('');
      await refresh();
      setMessage('Guardian invite sent.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to invite guardian.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(id: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await revokeGuardianInvite(id);
      await refresh();
      setMessage('Guardian link revoked.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to revoke invite.');
    } finally {
      setBusy(false);
    }
  }

  if (!athlete || !completeness) {
    return (
      <main className="wideMain">
        <div className="card">
          {error ? <p className="error">{error}</p> : <p>Loading settings…</p>}
        </div>
      </main>
    );
  }

  const isPublished = athlete.profileStatus === 'PUBLISHED';

  return (
    <main className="wideMain">
      <AthleteNav />

      <div className="sectionBlock">
        <h1>Athlete settings</h1>
        <div className="inlineMeta">
          <StatusBadge status={athlete.profileStatus} />
          <StatusBadge status={athlete.profileVisibility} />
          <span className="mutedNote">Completeness {completeness.score}%</span>
        </div>
        {isPublished ? (
          <p className="mutedNote">
            Public page: <Link href={`/athletes/${athlete.slug}`}>/athletes/{athlete.slug}</Link>
          </p>
        ) : null}
      </div>

      <form className="sectionBlock form" onSubmit={(e) => void handleVisibility(e)}>
        <h2>Visibility</h2>
        <label className="label">
          Profile visibility
          <select className="select" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="PRIVATE">Private</option>
            <option value="CONNECTIONS">Connections</option>
            <option value="PUBLIC">Public</option>
          </select>
        </label>
        <button type="submit" className="button buttonPrimary" disabled={busy}>
          Save visibility
        </button>
      </form>

      <div className="sectionBlock">
        <h2>Publish</h2>
        <p>
          {completeness.readyToPublish
            ? 'Required checks are complete. You can publish your Passport.'
            : 'Finish required completeness checks before publishing.'}
        </p>
        <ul className="recommendList">
          {completeness.checks
            .filter((check) => check.requiredForPublish)
            .map((check) => (
              <li key={check.key}>
                {check.satisfied ? '✓' : '○'} {check.label}
              </li>
            ))}
        </ul>
        <div className="actions">
          {isPublished ? (
            <button type="button" className="button buttonSecondary" disabled={busy} onClick={() => void handleUnpublish()}>
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              className="button buttonPrimary"
              disabled={busy || !completeness.readyToPublish}
              onClick={() => void handlePublish()}
            >
              Publish Passport
            </button>
          )}
        </div>
      </div>

      <form className="sectionBlock form" onSubmit={(e) => void handleInvite(e)}>
        <h2>Guardian invite</h2>
        <p className="mutedNote">Invite an existing guardian account by email.</p>
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
          <select
            className="select"
            value={relationshipType}
            onChange={(e) => setRelationshipType(e.target.value)}
          >
            <option value="PARENT">Parent</option>
            <option value="GUARDIAN">Guardian</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <button type="submit" className="button buttonPrimary" disabled={busy}>
          Send invite
        </button>
      </form>

      <div className="sectionBlock">
        <h2>Guardian links</h2>
        {links.length === 0 ? (
          <p className="mutedNote">No guardian invites yet.</p>
        ) : (
          <ul className="metaList">
            {links.map((link) => (
              <li key={link.id}>
                <span className="metaLabel">
                  {link.guardianEmail ?? link.guardianUserId} · {link.inviteStatus}
                </span>
                <span className="metaValue">
                  {link.inviteStatus !== 'REVOKED' ? (
                    <button
                      type="button"
                      className="button buttonSecondary"
                      disabled={busy}
                      onClick={() => void handleRevoke(link.id)}
                    >
                      Revoke
                    </button>
                  ) : (
                    'Revoked'
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="statusOk">{message}</p> : null}
    </main>
  );
}

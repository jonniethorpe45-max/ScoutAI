'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import {
  ApiError,
  getMe,
  getMyAthleteProfile,
  upsertMyAthleteProfile,
  type AthleteProfilePayload,
} from '@/lib/api';

const emptyForm = {
  displayName: '',
  sport: 'football',
  position: '',
  graduationYear: '',
  highSchoolName: '',
  heightInches: '',
  weightLbs: '',
  bio: '',
  contactEmail: '',
  contactPhone: '',
  city: '',
  state: '',
};

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const me = await getMe();
        if (!me.roles.includes('ATHLETE')) {
          router.replace('/app');
          return;
        }
        try {
          const view = await getMyAthleteProfile();
          if (cancelled) return;
          applyProfile(view.profile);
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) {
            throw err;
          }
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/sign-in');
          return;
        }
        if (!cancelled) setError('Unable to load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function applyProfile(profile: AthleteProfilePayload) {
    setForm({
      displayName: profile.displayName ?? '',
      sport: profile.sport ?? 'football',
      position: profile.position ?? '',
      graduationYear: profile.graduationYear?.toString() ?? '',
      highSchoolName: profile.highSchoolName ?? '',
      heightInches: profile.heightInches?.toString() ?? '',
      weightLbs: profile.weightLbs?.toString() ?? '',
      bio: profile.bio ?? '',
      contactEmail: profile.contactEmail ?? '',
      contactPhone: profile.contactPhone ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
    });
  }

  function updateField(key: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        displayName: form.displayName,
        sport: form.sport || 'football',
        position: form.position || null,
        graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
        highSchoolName: form.highSchoolName || null,
        heightInches: form.heightInches ? Number(form.heightInches) : null,
        weightLbs: form.weightLbs ? Number(form.weightLbs) : null,
        bio: form.bio || null,
        contactEmail: form.contactEmail || null,
        contactPhone: form.contactPhone || null,
        city: form.city || null,
        state: form.state || null,
      };
      const view = await upsertMyAthleteProfile(payload);
      applyProfile(view.profile);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main>
        <div className="card">
          <p>Loading profile…</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="card">
        <p className="brand">ScoutAI</p>
        <h1>Athlete profile</h1>
        <p>Public fields are visible to entitled recruiters and org staff. Contact fields stay restricted.</p>

        <form className="form" onSubmit={handleSubmit}>
          <label className="label">
            Display name
            <input
              className="input"
              required
              value={form.displayName}
              onChange={(e) => updateField('displayName', e.target.value)}
            />
          </label>
          <label className="label">
            Sport
            <input
              className="input"
              value={form.sport}
              onChange={(e) => updateField('sport', e.target.value)}
            />
          </label>
          <label className="label">
            Position
            <input
              className="input"
              value={form.position}
              onChange={(e) => updateField('position', e.target.value)}
            />
          </label>
          <label className="label">
            Graduation year
            <input
              className="input"
              type="number"
              value={form.graduationYear}
              onChange={(e) => updateField('graduationYear', e.target.value)}
            />
          </label>
          <label className="label">
            High school
            <input
              className="input"
              value={form.highSchoolName}
              onChange={(e) => updateField('highSchoolName', e.target.value)}
            />
          </label>
          <label className="label">
            Height (inches)
            <input
              className="input"
              type="number"
              value={form.heightInches}
              onChange={(e) => updateField('heightInches', e.target.value)}
            />
          </label>
          <label className="label">
            Weight (lbs)
            <input
              className="input"
              type="number"
              value={form.weightLbs}
              onChange={(e) => updateField('weightLbs', e.target.value)}
            />
          </label>
          <label className="label">
            Bio
            <textarea
              className="input"
              rows={3}
              value={form.bio}
              onChange={(e) => updateField('bio', e.target.value)}
            />
          </label>
          <label className="label">
            City
            <input
              className="input"
              value={form.city}
              onChange={(e) => updateField('city', e.target.value)}
            />
          </label>
          <label className="label">
            State
            <input
              className="input"
              value={form.state}
              onChange={(e) => updateField('state', e.target.value)}
            />
          </label>
          <label className="label">
            Contact email (restricted)
            <input
              className="input"
              type="email"
              value={form.contactEmail}
              onChange={(e) => updateField('contactEmail', e.target.value)}
            />
          </label>
          <label className="label">
            Contact phone (restricted)
            <input
              className="input"
              value={form.contactPhone}
              onChange={(e) => updateField('contactPhone', e.target.value)}
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          {saved ? <p className="statusOk">Profile saved.</p> : null}
          <button className="button buttonPrimary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        <div className="actions">
          <Link className="button buttonSecondary" href="/app">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

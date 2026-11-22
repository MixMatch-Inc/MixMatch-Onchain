'use client';

import { TextField } from '@repo/ui/text-field';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/useAuth';
import { getProfile, updateProfile, uploadAvatar } from '../../lib/wallet-setup-client';

export default function ProfileEditPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    void getProfile(accessToken)
      .then((profile) => {
        setDisplayName(profile.displayName);
        setBio(profile.bio ?? '');
        setAvatarUrl(profile.avatarUrl ?? '');
      })
      .catch(() => setError('Could not load your profile.'));
  }, [accessToken]);

  const readFile = (selected: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = () => reject(new Error('Could not read that image.'));
      reader.readAsDataURL(selected);
    });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessToken) return;
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let nextAvatar = avatarUrl.trim() || null;
      if (file) {
        const data = await readFile(file);
        const result = await uploadAvatar(data, file.type, accessToken);
        nextAvatar = result.avatarUrl;
        setAvatarUrl(nextAvatar);
      }
      await updateProfile({ displayName: displayName.trim(), bio: bio.trim() || undefined, avatarUrl: nextAvatar }, accessToken);
      router.push('/payments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page page--narrow">
      <div className="row row--between">
        <h1>Edit profile</h1>
        <Link href="/payments">Back to payments</Link>
      </div>
      <form className="stack" onSubmit={(event) => void submit(event)} noValidate data-testid="profile-edit-screen">
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        <TextField
          label="Display name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          error={error ?? undefined}
        />
        <label>
          Bio
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={2000} rows={4} />
        </label>
        <label>
          Avatar URL
          <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://…" />
        </label>
        <label>
          Or upload an image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={saving} data-testid="save-profile-button">
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </main>
  );
}

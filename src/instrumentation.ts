export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const g = globalThis as unknown as { __brandyBackupScheduled?: boolean };
  if (g.__brandyBackupScheduled) return;
  g.__brandyBackupScheduled = true;

  const { createBackup } = await import('@/lib/backup');
  const HOUR = 60 * 60 * 1000;

  await createBackup();
  setInterval(() => { createBackup(); }, HOUR);
}

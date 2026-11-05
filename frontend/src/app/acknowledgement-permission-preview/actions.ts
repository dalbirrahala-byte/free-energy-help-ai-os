'use server';

import { redirect } from 'next/navigation';
import { approvePermissionReview, recordMockPermission } from '@/lib/lead-gateway/acknowledgementPermissionReview.server';
import { permissionReviewClient, reviewPath } from './session';

export async function approveMockWording(form: FormData) {
  const client = await permissionReviewClient();
  const approved = form.get('confirm') === 'yes' &&
    await approvePermissionReview(client, form.get('version'));
  redirect(approved ? reviewPath : `${reviewPath}?error=blocked`);
}

export async function saveMockPermission(form: FormData) {
  const client = await permissionReviewClient();
  const result = await recordMockPermission(client, {
    version: form.get('version'), testId: form.get('testId'),
    source: form.get('source'), permission: form.get('permission'),
  });
  redirect(result === 'blocked' ? `${reviewPath}?error=blocked` : reviewPath);
}

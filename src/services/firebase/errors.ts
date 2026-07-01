/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth } from './config';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Parses and returns a user-friendly error message from a Firebase/Firestore exception.
 */
export function getFriendlyErrorMessage(err: any): string {
  if (!err) return 'An unknown error occurred.';
  try {
    const parsed = JSON.parse(err.message);
    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      const msg = parsed.error;
      if (msg.includes('permission-denied') || msg.includes('permission denied')) {
        return 'Access Denied: You do not have permissions to write or read this document. Please check that you are signed in.';
      }
      return msg;
    }
  } catch (e) {
    // Message is not a custom JSON string
  }

  const rawMessage = err.message || String(err);
  if (rawMessage.includes('permission-denied') || rawMessage.includes('permission denied') || rawMessage.includes('Missing or insufficient permissions')) {
    return 'Access Denied: Missing or insufficient permissions to complete this operation.';
  }
  if (rawMessage.includes('quota exceeded') || rawMessage.includes('Quota exceeded')) {
    return 'Quota Exceeded: The system is experiencing high traffic. Please try again tomorrow.';
  }
  return rawMessage;
}


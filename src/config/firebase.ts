import admin from 'firebase-admin';
import { env } from './env';
import { logger } from '../utils/logger';

const hasFirebaseConfig =
  env.firebase.projectId &&
  env.firebase.privateKey &&
  env.firebase.clientEmail &&
  !env.firebase.projectId.startsWith('TODO');

if (!admin.apps.length) {
  if (hasFirebaseConfig) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebase.projectId,
        privateKey: env.firebase.privateKey,
        clientEmail: env.firebase.clientEmail,
      }),
    });
    logger.info('Firebase Admin initialized');
  } else {
    admin.initializeApp();
    logger.warn(
      'Firebase Admin initialized WITHOUT credentials — auth will not work until .env is configured'
    );
  }
}

export const firebaseAdmin = admin;

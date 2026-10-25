import { http, HttpResponse } from 'msw';

import { EVALS_URL } from '../../api/config';
import { snapshot } from '../fixtures';

export const snapshotUrl = EVALS_URL;

export const handlers = [http.get(snapshotUrl, () => HttpResponse.json(snapshot))];

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EVAL_SET } from '../eval/dataset';
import { EvalPage, type Reader } from '../eval/EvalPage';
import { CLOUD_MODEL } from '../outbound/channel';
import { CLOUD_BASELINE_NAME, cloudReaders, MIN_GAP_MS } from './cloud';
import '../ui/app.css';
import '../eval/eval.css';

// Each letter takes four requests, one every MIN_GAP_MS at the most.
const minutes = Math.ceil((EVAL_SET.length * 4 * MIN_GAP_MS) / 60_000);

const cloud: Reader = {
  id: 'cloud',
  modelName: CLOUD_BASELINE_NAME,
  heading: 'Letterkind — evaluation, cloud baseline',
  intro: `The same ${EVAL_SET.length} made-up letters and the same scoring as the on-device evaluation, but read by ${CLOUD_MODEL} in the cloud with the whole letter in the prompt. The app never does this: it is here to measure what keeping the letter on the device costs in accuracy and time.`,
  rowLabel: 'Cloud model (baseline)',
  status: () => Promise.resolve('ready'),
  statusText: {
    checking: 'Checking…',
    ready: `Cloud baseline: each made-up letter is sent whole to ${CLOUD_MODEL}.`,
    downloadable: '',
    downloading: '',
    unavailable: '',
    unsupported: '',
  },
  firstLetterNote: `Requests are spaced to stay inside the free quota; the whole set takes about ${minutes} minutes.`,
  models: cloudReaders,
  network: `Each of the ${EVAL_SET.length} made-up letters is sent, whole, to ${CLOUD_MODEL} through Firebase AI Logic, with Firebase App Check. Nothing else is sent: this page has no way to read a letter of your own.`,
};

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
createRoot(root).render(
  <StrictMode>
    <EvalPage reader={cloud} />
  </StrictMode>,
);

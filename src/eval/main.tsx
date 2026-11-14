import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { deviceModelStatus } from '../ai/availability';
import { onDeviceClassifier, onDeviceExtractor } from '../ai/onDevice';
import { EVAL_SET } from './dataset';
import { EvalPage, type Reader } from './EvalPage';
import { DEVICE_MODEL_NAME } from './result';
import '../ui/app.css';
import './eval.css';

const onDevice: Reader = {
  id: 'nano',
  modelName: DEVICE_MODEL_NAME,
  heading: 'Letterkind — evaluation',
  intro: `${EVAL_SET.length} synthetic official letters with known answers, read by the on-device model in this browser through the same code as the app. The question it answers: how often would a wrong amount, date, phone number or name reach the reader — from the model alone, and after the app’s checks?`,
  rowLabel: 'On-device model',
  status: deviceModelStatus,
  statusText: {
    checking: 'Checking for the on-device model…',
    ready: 'On-device model ready.',
    downloadable: 'This browser can run the on-device model but has not downloaded it yet. Open the app once and download it there, then come back.',
    downloading: 'The on-device model is still downloading. Try again when it has finished.',
    unavailable: 'This device cannot run the browser’s built-in model, so the evaluation cannot run here.',
    unsupported: 'This browser has no built-in model. The evaluation needs a recent desktop Chrome.',
  },
  firstLetterNote: 'Each letter is read four times; expect under a minute per letter.',
  models: () => ({ classify: onDeviceClassifier, extract: onDeviceExtractor }),
  network: 'Nothing is sent anywhere: the letters are read in this browser.',
};

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
createRoot(root).render(
  <StrictMode>
    <EvalPage reader={onDevice} />
  </StrictMode>,
);

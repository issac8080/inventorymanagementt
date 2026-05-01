import 'fake-indexeddb/auto';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import '@testing-library/jest-dom';

// Lazy routes + Suspense need longer than the default 1000ms for findBy/waitFor.
configure({ asyncUtilTimeout: 15000 });

let blobUrlSeq = 0;
const UrlGlobal = globalThis.URL;
if (UrlGlobal && typeof UrlGlobal.createObjectURL !== 'function') {
  UrlGlobal.createObjectURL = () => `blob:http://localhost/mock-${++blobUrlSeq}`;
  UrlGlobal.revokeObjectURL = () => {};
}

afterEach(() => {
  cleanup();
});

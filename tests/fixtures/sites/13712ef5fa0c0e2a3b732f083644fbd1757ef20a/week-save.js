'use strict';

// All updated tabs serialize compare-and-write on the same origin lock.
// The single localStorage record retains compatibility with v47 exports.
window.RingSaveGuard = (() => {
  function exclusive(key, operation) {
    return window.navigator?.locks?.request('ring-save:' + key, operation) ?? operation();
  }

  function open(storage, key) {
    let expected = storage.getItem(key);
    let revision = 0;
    try { revision = JSON.parse(expected)?.revision || 0; } catch {}
    if (!Number.isSafeInteger(revision) || revision < 0) revision = 0;

    function write(snapshot) {
      const value = JSON.parse(JSON.stringify(snapshot));
      return exclusive(key, () => {
        if (storage.getItem(key) !== expected) {
          const conflict = Error('다른 탭에서 진행이 저장됐어요.');
          conflict.name = 'RingSaveConflict';
          throw conflict;
        }
        value.revision = revision + 1;
        const next = JSON.stringify(value);
        storage.setItem(key, next);
        expected = next;
        revision = value.revision;
        return revision;
      });
    }
    return { write };
  }
  return { open, exclusive };
})();

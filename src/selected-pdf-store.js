const DATABASE_NAME = 'kokugo-2in1';
const STORE_NAME = 'selected-pdfs';

function openDatabase(indexedDb = indexedDB) {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('PDF保存用データベースを開けませんでした。'));
  });
}

function requestResult(request, failureMessage) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error(failureMessage));
  });
}

export function createIndexedDbSelectedPdfDatabase(indexedDb = indexedDB) {
  let databasePromise;

  async function withStore(mode, operation) {
    databasePromise ||= openDatabase(indexedDb);
    const database = await databasePromise;
    return operation(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
  }

  return {
    put(record) {
      return withStore('readwrite', (store) => requestResult(store.put(record), '選択したPDFを保存できませんでした。'));
    },
    get(id) {
      return withStore('readonly', (store) => requestResult(store.get(id), '選択したPDFを読み込めませんでした。'));
    },
    delete(id) {
      return withStore('readwrite', (store) => requestResult(store.delete(id), '選択したPDFを削除できませんでした。'));
    }
  };
}

export function createSelectedPdfStore({
  database = createIndexedDbSelectedPdfDatabase(),
  createId = () => crypto.randomUUID()
} = {}) {
  return {
    async stage(file) {
      if (!(file instanceof Blob)) throw new Error('選択したファイルを保存できませんでした。');
      const id = createId();
      await database.put({ id, file });
      return id;
    },
    async retrieve(id) {
      return (await database.get(id))?.file;
    },
    async delete(id) {
      await database.delete(id);
    }
  };
}

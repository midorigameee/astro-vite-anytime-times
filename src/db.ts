const DB_NAME = 'TimesAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'messages';

let db: IDBDatabase;

// 型定義をファイル内に再定義
interface Reply {
  id: number;
  user: { name: string; avatar: string };
  text: string;
  timestamp: string;
  image?: string;
}

interface Message {
  id: number;
  user: { name: string; avatar: string };
  text: string;
  timestamp: string;
  replies: Reply[];
  image?: string;
}

// DBを初期化・オープンする関数
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDBのオープンに失敗しました');
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    // テーブル（オブジェクトストア）の作成・更新
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // メッセージIDはApp.tsxでDate.now()を使って採番するため、autoIncrementは不要
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// メッセージをDBに保存する関数
export const saveMessagesToDB = async (messages: Message[]): Promise<void> => {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // 既存のデータをクリア
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
        // 新しいデータを一括で追加
        messages.forEach(message => {
            store.put(message);
        });
    };

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      console.error('メッセージの保存に失敗しました', transaction.error);
      reject(transaction.error);
    };
  });
};

// DBからメッセージを読み込む関数
export const loadMessagesFromDB = async (): Promise<Message[]> => {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      console.error('メッセージの読み込みに失敗しました', request.error);
      reject(request.error);
    };
  });
};

// DBからすべてのメッセージをクリアする関数
export const clearAllMessagesFromDB = async (): Promise<void> => {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      console.error('メッセージのクリアに失敗しました', request.error);
      reject(request.error);
    };
  });
};
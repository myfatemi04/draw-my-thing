const ONE_SECOND = 1e3;
const MAX_BATCH_SIZE = 30;

class Batcher<T> {
  private _waitHandle: any;
  private _data: T[];
  private _cb: (events: T[]) => void;
  constructor(callback: (events: T[]) => void) {
    this._waitHandle = null;
    this._data = [];
    this._cb = callback;
  }
  addToBatch(value: T) {
    if (this._waitHandle == null) {
      this._waitHandle = setTimeout(() => {
        this._waitHandle = null;
        this.forceEndBatch();
      }, ONE_SECOND);
    }
    this._data.push(value);
    if (this._data.length >= MAX_BATCH_SIZE) {
      this.forceEndBatch();
    }
  }
  forceEndBatch() {
    if (this._waitHandle != null) {
      clearTimeout(this._waitHandle);
      this._waitHandle = null;
    }
    if (this._data.length > 0) {
      this._cb(this._data);
    }
    this._data = [];
  }
}

export default Batcher;

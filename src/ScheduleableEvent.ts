class ScheduleableEvent {
  private _handle = null as NodeJS.Timeout;

  constructor(private _cb) {}

  schedule(delay: number) {
    if (this._handle == null) {
      this._handle = setTimeout(() => {
        this._cb();
        this._handle = null;
      }, delay);
      return true;
    }
    return false;
  }

  cancel() {
    if (this._handle) {
      clearTimeout(this._handle);
      return true;
    }
    this._handle = null;
    return false;
  }
}

export default ScheduleableEvent;

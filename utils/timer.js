class Timer {
  constructor(minutes = 3) {
    this.minutes = minutes;

    /** @type {number} */
    this.duration = Date.now() + this.minutes * 60 * 1000;
    /** @type {number} */
    this.interval = null;
  }

  start(cb = () => {}) {
    this.interval = setInterval(() => {
      const remainingTime = this.duration - Date.now();

      document.getElementById('time').innerHTML = new Date(remainingTime)
        .toISOString()
        .substring(14, 22)
        .replace('.', ':');

      if (remainingTime <= 0) {
        cb();
        this.stop();
      }
    }, 100);
  }

  stop() {
    clearInterval(this.interval);
    // document.getElementById('time').innerHTML = '00:00:00';
  }

  reset() {
    this.duration = Date.now() + this.minutes * 60 * 1000;
  }
}

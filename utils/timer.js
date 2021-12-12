class Timer {
  constructor() {
    /** @type {number} */
    this.startTime = Date.now();
    /** @type {number} */
    this.interval = null;
  }

  start() {
    this.interval = setInterval(() => {
      const elapsedTime = Date.now() - this.startTime;

      document.getElementById('time').innerHTML = new Date(elapsedTime)
        .toISOString()
        .substring(14, 22)
        .replace('.', ':');
    }, 100);
  }

  stop() {
    clearInterval(this.interval);
  }

  reset() {
    this.startTime = Date.now();
  }
}

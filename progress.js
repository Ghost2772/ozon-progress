/* The component only owns its indicator. Controls belong to the application. */
(() => {
  'use strict';

  class Progress {
    #element;
    #arc;
    #state = { value: 0, animated: false, hidden: false };

    constructor(container, { value = 0, animated = false, hidden = false, label = 'Progress' } = {}) {
      if (!(container instanceof Element)) {
        throw new TypeError('Progress: container must be a DOM element.');
      }

      const element = document.createElement('div');
      element.className = 'progress';
      element.setAttribute('role', 'progressbar');
      element.setAttribute('aria-label', label);
      element.setAttribute('aria-valuemin', '0');
      element.setAttribute('aria-valuemax', '100');
      element.innerHTML = `
        <svg class="progress__ring" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <circle class="progress__track" cx="60" cy="60" r="55"></circle>
          <circle class="progress__arc" cx="60" cy="60" r="55"
            pathLength="100" stroke-dasharray="100 100"
            transform="rotate(-90 60 60)"></circle>
        </svg>
      `;

      this.#element = element;
      this.#arc = element.querySelector('.progress__arc');
      this.setState({ value, animated, hidden });
      container.append(element);
    }

    get value() {
      return this.#state.value;
    }

    get animated() {
      return this.#state.animated;
    }

    get hidden() {
      return this.#state.hidden;
    }

    get state() {
      return { ...this.#state };
    }

    setValue(value) {
      return this.setState({ value });
    }

    setAnimated(animated) {
      return this.setState({ animated });
    }

    setHidden(hidden) {
      return this.setState({ hidden });
    }

    setState(state = {}) {
      if (state === null || typeof state !== 'object' || Array.isArray(state)) {
        throw new TypeError('Progress: state must be an object.');
      }
      const { value, animated, hidden } = { ...this.#state, ...state };

      // Validate the entire update before changing either the state or the DOM.
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new TypeError('Progress: value must be a finite number.');
      }
      if (typeof animated !== 'boolean' || typeof hidden !== 'boolean') {
        throw new TypeError('Progress: animated and hidden must be boolean.');
      }

      const normalizedValue = Math.min(100, Math.max(0, value));
      this.#state = { value: normalizedValue, animated, hidden };
      this.#arc.setAttribute('stroke-dashoffset', String(100 - normalizedValue));
      this.#element.setAttribute('aria-valuenow', String(normalizedValue));
      this.#element.classList.toggle('progress--animated', animated);
      this.#element.hidden = hidden;

      return this;
    }

    destroy() {
      this.#element.remove();
    }
  }

  window.Progress = Progress;
})();

(() => {
  'use strict';

  const valueInput = document.querySelector('#value');
  const animateInput = document.querySelector('#animate');
  const hideInput = document.querySelector('#hide');

  const progress = new Progress(document.querySelector('#progress'), {
    value: valueInput.valueAsNumber,
    animated: animateInput.checked,
    hidden: hideInput.checked,
  });

  valueInput.addEventListener('input', () => {
    // An empty or incomplete number is allowed while the user is editing.
    if (!Number.isFinite(valueInput.valueAsNumber)) return;

    progress.setValue(valueInput.valueAsNumber);

    if (valueInput.valueAsNumber !== progress.value) {
      valueInput.value = String(progress.value);
    }
  });

  valueInput.addEventListener('blur', () => {
    valueInput.value = String(progress.value);
  });

  animateInput.addEventListener('change', () => {
    progress.setAnimated(animateInput.checked);
  });

  hideInput.addEventListener('change', () => {
    progress.setHidden(hideInput.checked);
  });
})();

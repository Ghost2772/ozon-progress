/* Browser tests, without a test framework or third-party dependencies. */
(async () => {
  'use strict';

  const results = document.querySelector('#results');
  const fixtures = document.querySelector('#fixtures');
  let passed = 0;
  let failed = 0;

  const assert = (condition, message = 'Условие не выполнено') => {
    if (!condition) throw new Error(message);
  };

  const equal = (actual, expected) => {
    assert(Object.is(actual, expected), `Ожидалось ${expected}, получено ${actual}`);
  };

  const throws = (action) => {
    let error;
    try { action(); } catch (caught) { error = caught; }
    assert(error instanceof TypeError, 'Ожидался TypeError');
  };

  const test = async (name, action) => {
    const item = document.createElement('li');
    try {
      await action();
      passed += 1;
      item.className = 'pass';
      item.textContent = `PASS — ${name}`;
    } catch (error) {
      failed += 1;
      item.className = 'fail';
      item.textContent = `FAIL — ${name}: ${error.message}`;
    }
    results.append(item);
  };

  const mount = (options) => {
    const host = document.createElement('div');
    fixtures.append(host);
    return { host, progress: new Progress(host, options) };
  };

  await test('По умолчанию: 0, без вращения, видимый', () => {
    const { host, progress } = mount();
    equal(progress.value, 0);
    equal(progress.animated, false);
    equal(progress.hidden, false);
    equal(host.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'), '0');
    equal(host.querySelector('.progress__arc').getAttribute('stroke-dashoffset'), '100');
  });

  await test('Начало дуги — 12 часов; при 25, 50 и 100 длина корректна', () => {
    const { host, progress } = mount();
    const arc = host.querySelector('.progress__arc');
    equal(arc.getAttribute('transform'), 'rotate(-90 60 60)');
    for (const [value, offset] of [[25, '75'], [50, '50'], [100, '0']]) {
      progress.setValue(value);
      equal(arc.getAttribute('stroke-dashoffset'), offset);
      equal(host.firstElementChild.getAttribute('aria-valuenow'), String(value));
    }
  });

  await test('Значения вне диапазона ограничиваются 0 и 100', () => {
    const { progress } = mount();
    progress.setValue(-15);
    equal(progress.value, 0);
    progress.setValue(150);
    equal(progress.value, 100);
  });

  await test('Дробные значения поддерживаются', () => {
    const { host, progress } = mount({ value: 12.5 });
    equal(progress.value, 12.5);
    equal(host.firstElementChild.getAttribute('aria-valuenow'), '12.5');
    equal(host.querySelector('.progress__arc').getAttribute('stroke-dashoffset'), '87.5');
  });

  await test('NaN, Infinity, строки и null отклоняются без потери состояния', () => {
    const { progress } = mount({ value: 40 });
    for (const invalid of [NaN, Infinity, -Infinity, '50', '', null, undefined]) {
      throws(() => progress.setValue(invalid));
      equal(progress.value, 40);
    }
  });

  await test('При неверном флаге всё обновление отменяется', () => {
    const { host, progress } = mount({ value: 40 });
    throws(() => progress.setState({ value: 75, animated: 'yes' }));
    throws(() => progress.setHidden(1));
    equal(progress.value, 40);
    equal(progress.animated, false);
    equal(progress.hidden, false);
    equal(host.firstElementChild.getAttribute('aria-valuenow'), '40');
  });

  await test('Animate и Hide независимы; значение меняется и в скрытом состоянии', () => {
    const { host, progress } = mount({ value: 25, animated: true });
    progress.setHidden(true).setValue(75);
    equal(progress.animated, true);
    equal(progress.hidden, true);
    equal(progress.value, 75);
    assert(host.firstElementChild.hidden);
    progress.setHidden(false);
    equal(progress.value, 75);
    assert(host.firstElementChild.classList.contains('progress--animated'));
  });

  await test('setState одновременно обновляет три параметра', () => {
    const { progress } = mount();
    equal(progress.setState({ value: 85, animated: true, hidden: true }), progress);
    equal(progress.value, 85);
    equal(progress.animated, true);
    equal(progress.hidden, true);
  });

  await test('Полученная копия state не меняет внутреннее состояние', () => {
    const { progress } = mount({ value: 30 });
    const state = progress.state;
    state.value = 99;
    state.hidden = true;
    equal(progress.value, 30);
    equal(progress.hidden, false);
  });

  await test('Два экземпляра работают независимо', () => {
    const first = mount({ value: 20 }).progress;
    const second = mount({ value: 80 }).progress;
    first.setValue(10).setAnimated(true).setHidden(true);
    equal(second.value, 80);
    equal(second.animated, false);
    equal(second.hidden, false);
  });

  await test('Неверный контейнер вызывает понятную ошибку', () => {
    throws(() => new Progress(null));
    throws(() => new Progress('#progress'));
  });

  await test('destroy удаляет только свой индикатор', () => {
    const { host, progress } = mount();
    const sibling = document.createElement('span');
    sibling.textContent = 'keep';
    host.append(sibling);
    progress.destroy();
    equal(host.querySelector('.progress'), null);
    equal(host.firstElementChild, sibling);
  });

  const frames = [...document.querySelectorAll('iframe')];
  await Promise.all(frames.map((frame) => {
    if (frame.contentWindow.Progress) return Promise.resolve();
    return new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));
  }));

  const portrait = document.querySelector('#portrait');
  const doc = portrait.contentDocument;
  const win = portrait.contentWindow;
  const input = doc.querySelector('#value');
  const indicator = doc.querySelector('[role="progressbar"]');
  const animate = doc.querySelector('#animate');
  const hide = doc.querySelector('#hide');
  const fill = (value) => {
    input.value = value;
    input.dispatchEvent(new win.Event('input', { bubbles: true }));
  };

  await test('Приложение запускается со значением 60', () => {
    equal(input.value, '60');
    equal(indicator.getAttribute('aria-valuenow'), '60');
  });

  await test('Поле Value управляет индикатором', () => {
    fill('25');
    equal(indicator.getAttribute('aria-valuenow'), '25');
  });

  await test('Ввод -5 и 125 нормализуется и в поле, и в индикаторе', () => {
    fill('-5');
    equal(input.value, '0');
    equal(indicator.getAttribute('aria-valuenow'), '0');
    fill('125');
    equal(input.value, '100');
    equal(indicator.getAttribute('aria-valuenow'), '100');
  });

  await test('Дробное значение из поля не округляется', () => {
    fill('37.5');
    equal(indicator.getAttribute('aria-valuenow'), '37.5');
  });

  await test('Пустой ввод сохраняет значение и восстанавливается при blur', () => {
    fill('');
    equal(indicator.getAttribute('aria-valuenow'), '37.5');
    input.dispatchEvent(new win.Event('blur'));
    equal(input.value, '37.5');
  });

  await test('Нечисловой ввод не ломает индикатор', () => {
    fill('abc');
    equal(indicator.getAttribute('aria-valuenow'), '37.5');
    input.dispatchEvent(new win.Event('blur'));
    equal(input.value, '37.5');
  });

  await test('Animate включает непрерывное вращение по часовой стрелке', () => {
    animate.click();
    const ring = doc.querySelector('.progress__ring');
    equal(win.getComputedStyle(ring).animationName, 'progress-rotate');
    const animation = ring.getAnimations()[0];
    assert(animation);
    equal(animation.playState, 'running');
    const keyframes = animation.effect.getKeyframes();
    equal(keyframes[0].transform, 'rotate(0deg)');
    equal(keyframes[keyframes.length - 1].transform, 'rotate(360deg)');
  });

  await test('Hide скрывает индикатор, сохраняет место и положение управления', () => {
    const controls = doc.querySelector('.controls');
    const before = controls.getBoundingClientRect();
    hide.click();
    assert(indicator.hidden);
    equal(win.getComputedStyle(indicator).display, 'none');
    equal(doc.querySelector('.progress-slot').getBoundingClientRect().width, 120);
    equal(controls.getBoundingClientRect().x, before.x);
    equal(controls.getBoundingClientRect().y, before.y);
    assert(animate.checked);
    equal(win.getComputedStyle(doc.querySelector('.progress__ring')).animationPlayState, 'paused');
  });

  await test('Скрытый индикатор принимает значение и возвращается с вращением', () => {
    fill('90');
    hide.click();
    equal(indicator.hidden, false);
    equal(indicator.getAttribute('aria-valuenow'), '90');
    assert(animate.checked);
    equal(win.getComputedStyle(doc.querySelector('.progress__ring')).animationName, 'progress-rotate');
    animate.click();
    fill('60');
    equal(win.getComputedStyle(doc.querySelector('.progress__ring')).animationName, 'none');
  });

  const checkLayout = (frame, direction) => {
    const frameDoc = frame.contentDocument;
    const frameWin = frame.contentWindow;
    equal(frameWin.getComputedStyle(frameDoc.querySelector('.demo')).flexDirection, direction);
    assert(frameDoc.documentElement.scrollWidth <= frameWin.innerWidth, 'Горизонтальное переполнение');
    assert(frameDoc.documentElement.scrollHeight <= frameWin.innerHeight, 'Вертикальное переполнение');
    const ring = frameDoc.querySelector('.progress-slot').getBoundingClientRect();
    const controls = frameDoc.querySelector('.controls').getBoundingClientRect();
    if (direction === 'column') {
      assert(Math.abs(ring.x + ring.width / 2 - frameWin.innerWidth / 2) < 1);
      assert(ring.bottom < controls.top, 'Элементы должны идти сверху вниз');
    } else {
      assert(ring.right < controls.left, 'Элементы должны идти слева направо');
      assert(Math.abs(ring.y + ring.height / 2 - controls.y - controls.height / 2) < 1);
    }
  };

  await test('Portrait 320 × 568: вертикальная компоновка без прокрутки', () => {
    checkLayout(portrait, 'column');
  });

  await test('Landscape 568 × 320: горизонтальная компоновка без прокрутки', () => {
    checkLayout(document.querySelector('#landscape'), 'row');
  });

  await test('Поворот одного экрана сохраняет значение и переключатели', async () => {
    fill('45');
    animate.click();
    portrait.width = '568';
    portrait.height = '320';
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    checkLayout(portrait, 'row');
    equal(input.value, '45');
    assert(animate.checked);
    portrait.width = '320';
    portrait.height = '568';
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    checkLayout(portrait, 'column');
    equal(indicator.getAttribute('aria-valuenow'), '45');
    assert(animate.checked);
    animate.click();
    fill('60');
  });

  await test('390 × 844, 844 × 390, 280 × 400: нет переполнения', async () => {
    try {
      for (const [width, height, direction] of [[390, 844, 'column'], [844, 390, 'row'], [280, 400, 'column']]) {
        portrait.width = String(width);
        portrait.height = String(height);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        checkLayout(portrait, direction);
      }
    } finally {
      portrait.width = '320';
      portrait.height = '568';
    }
  });

  fixtures.replaceChildren();
  const summary = document.querySelector('#summary');
  summary.textContent = `Пройдено: ${passed}. Ошибок: ${failed}. Всего: ${passed + failed}.`;
  summary.className = failed ? 'fail' : 'pass';
  document.title = `${failed ? 'FAIL' : 'PASS'} — Progress (${passed}/${passed + failed})`;
})();

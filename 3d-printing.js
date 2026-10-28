(() => {
  const form = document.getElementById('print-request');
  const hours = document.getElementById('print-hours');
  const minutes = document.getElementById('print-minutes');
  const quantity = document.getElementById('quantity');
  const unknown = document.getElementById('unknown-time');
  const presets = [...document.querySelectorAll('[data-minutes]')];
  const total = document.getElementById('estimate-total');
  const math = document.getElementById('estimate-math');
  const error = document.getElementById('form-error');
  const submit = document.getElementById('submit-request');
  const status = document.getElementById('submit-status');
  const success = document.getElementById('request-success');
  function newRequestId() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map(n => n.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  let requestId = newRequestId();
  let busy = false;
  const requestEndpoint = ['opbraingym.com', 'www.opbraingym.com', 'pbangiola.github.io'].includes(location.hostname)
    ? 'https://brain-gym-print-review.paulbanj.chatgpt.site/api/print-requests'
    : '/api/print-requests';
  const money = cents => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(cents/100);
  function readEstimate() {
    const h = Number(hours.value), m = Number(minutes.value), q = Number(quantity.value);
    const time = h * 60 + m;
    const validQuantity = quantity.value !== '' && Number.isInteger(q) && q >= 1 && q <= 99;
    const validTime = unknown.checked || (hours.value !== '' && minutes.value !== '' && Number.isInteger(h) && Number.isInteger(m) && h >= 0 && m >= 0 && m <= 59 && time > 0 && time <= 10080);
    return { time: unknown.checked ? null : time, q, validQuantity, validTime };
  }
  function updateEstimate() {
    const value = readEstimate();
    document.getElementById('time-fields').disabled = unknown.checked;
    hours.setCustomValidity('');
    minutes.setCustomValidity('');
    if (!unknown.checked && !value.validTime) hours.setCustomValidity('Enter 1 minute to 168 hours per copy. Minutes must be between 0 and 59.');
    presets.forEach(button => button.setAttribute('aria-pressed', String(!unknown.checked && Number(button.dataset.minutes) === value.time)));
    if (!value.validQuantity || !value.validTime) {
      total.textContent = '—';
      math.textContent = !value.validQuantity ? 'Choose 1 to 99 whole copies.' : 'Enter a time from 1 minute to 168 hours.';
    } else if (value.time === null) {
      total.textContent = 'Quote needed';
      math.textContent = 'Send your model. We’ll work out the print time with you.';
    } else {
      total.textContent = money(value.time * value.q * 5);
      math.textContent = `${value.time.toLocaleString()} minutes × ${value.q} ${value.q === 1 ? 'copy' : 'copies'} × $0.05`;
    }
  }
  [hours, minutes, quantity, unknown].forEach(input => input.addEventListener('input', updateEstimate));
  presets.forEach(button => button.addEventListener('click', () => {
    hours.value = Math.floor(Number(button.dataset.minutes)/60);
    minutes.value = Number(button.dataset.minutes)%60;
    updateEstimate();
  }));
  function showError(message) { error.textContent = message; error.hidden = false; error.focus(); }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    error.hidden = true;
    updateEstimate();
    const model = document.getElementById('model-url');
    model.setCustomValidity('');
    if (model.value) {
      try {
        const url = new URL(model.value);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) throw new Error();
      } catch { model.setCustomValidity('Enter a full public http or https model link.'); }
    }
    if (!form.checkValidity()) {
      const invalid = form.querySelector(':invalid');
      invalid.focus();
      invalid.scrollIntoView({block:'center'});
      invalid.reportValidity();
      return;
    }
    const value = readEstimate();
    const data = new FormData(form);
    const payload = { requestId, name:data.get('name'), email:data.get('email'), modelUrl:data.get('modelUrl'), notes:data.get('notes'), website:data.get('website'), quantity:value.q, minutesPerCopy:value.time };
    busy = true; submit.disabled = true; submit.textContent = 'Saving your request…'; status.textContent = 'Please wait while your request is saved.';
    try {
      const response = await fetch(requestEndpoint, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your request wasn’t saved. Please try again.');
      document.getElementById('receipt-email').textContent = String(payload.email).trim();
      document.getElementById('receipt-reference').textContent = result.id;
      document.getElementById('receipt-total').textContent = result.estimateCents === null ? 'Print time and quote to be confirmed.' : `Estimated total: ${money(result.estimateCents)} for ${result.quantity} ${result.quantity === 1 ? 'copy' : 'copies'}.`;
      form.hidden = true; success.hidden = false; success.focus();
    } catch (failure) {
      showError(failure instanceof TypeError ? 'Connection problem. Your details are still here. Please try submitting again.' : failure.message);
    } finally {
      busy = false; submit.disabled = false; submit.innerHTML = 'Submit print request <span aria-hidden="true">→</span>'; status.textContent = '';
    }
  });
  document.getElementById('model-url').addEventListener('input', event => event.target.setCustomValidity(''));
  document.getElementById('new-request').addEventListener('click', () => {
    form.reset(); requestId = newRequestId(); error.hidden = true; success.hidden = true; form.hidden = false; updateEstimate(); document.getElementById('customer-name').focus();
  });
  updateEstimate();
})();

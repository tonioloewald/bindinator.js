/**
# Tutorial 2. Mortgage Calculator Component

**Caution**: work in progress.

We're going to make a mortgage calculator component.

We'll start with plain HTML.

    <form class="mortgage-calculator" >
      <label>
        Total Price<br>
        <input type="number" min="0" step="10000">
      </label>
      <label>
        Deposit<br>
        <input type="number" min="0" step="1">%
      </label>
      <div>
        $<span>000.00</span>
      </div>
      <label>
        Loan Type<br>
        <select>
          <option value="0">Interest Only (ARM)</option>
          <option value="30">30 year Fixed</option>
          <option value="20">20 year Fixed</option>
          <option value="15">15 year Fixed</option>
          <option value="10">10 year Fixed</option>
        </select>
      </label>
      <label>
        Interest Rate<br>
        <input type="number" min="0" step="0.05">%
      </label>
      <label>
        Interest Rate (APR)<br>
        <input type="number" disabled>%
      </label>
      <label>
        Loan Principal<br>
        <input type="number" disabled>
      </label>
      <div>
        <span>00</span> payments
      </div>
      <label>
        Monthly Payment</br>
        <input type="number" disabled>
      </label>
    </form>

Now we're going to create an object to hold our loan information:

    const loan = {
      total: 100000,
      deposit: 20,
      type: 30,
      rate: 3.95,
    };

To bind these values to our user interface, we add some attributes:

    <label>
      Total Price<br>
      <input type="number" min="0" step="10000" data-bind="value=_component_.total">
    </label>
    <label>
      Deposit<br>
      <input type="number" min="0" step="1" data-bind="value=_component_.deposit">%
    </label>
    <div>
      $<span data-bind="text=_component_.deposit_amount">000.00</span>
    </div>
    <label>
      Loan Type<br>
      <select data-bind="value=_component_.type">
        <option value="0">Interest Only (ARM)</option>
        <option value="30">30 year Fixed</option>
        <option value="20">20 year Fixed</option>
        <option value="15">15 year Fixed</option>
        <option value="10">10 year Fixed</option>
      </select>
    </label>

Now we need to calculate the remaining values:

    const calculate = () => {
      // we're only going to get values out of loan, so we can just get the whole object
      const loan = b8r.get('loan');
      // in the US, quoted interest rates are a lie, and simply 12x the monthly rate
      const monthly_rate = _component_.rate * 0.01 / 12;
      // in case the user wants to the rate that they're actually paying
      b8r.set('_component_.apr', ((Math.pow(1 + monthly_rate, 12) - 1) * 100).toFixed(2));
      const deposit_amount = _component_.deposit * 0.01 * _component_.total;
      const principal = _component_.total - deposit_amount;
      let payment;
      let num_payments;
      if (_component_.type === 0) {
        payment = (monthly_rate * principal).toFixed(2);
        num_payments = '∞';
      } else {
        num_payments = _component_.type * 12;
        // how much will this loan be worth at the end of the duration?
        const future_principal_value = Math.pow(1 + monthly_rate, num_payments) * principal;
        // how much will a compounded payment of $1 be worth at the end of the duration?
        const future_payment_value = (Math.pow(1 + monthly_rate, num_payments) - 1)/monthly_rate;
        payment = (future_principal_value / future_payment_value).toFixed(2);
      }
      // we'll set the newly calculated values via b8r, so it can update bound elements
      b8r.set('_component_.deposit_amount', deposit_amount);
      b8r.set('_component_.payment', payment);
      b8r.set('_component_.principal', principal);
      b8r.set('_component_.num_payments', '' + num_payments);
    };

**Note**: we set _component_.num_payments to a string because otherwise it will be
set to a number initially, and if a interest-only loan is taken, the '∞' string
will be converted into a number by b8r.set().

We also need to calculate() once:

    calculate();

Finally, we need to bind the calculated values as before:

    <label>
      Interest Rate<br>
      <input type="number" min="0" step="0.05" data-bind="value=_component_.rate">%
    </label>
    <label>
      Interest Rate (APR)<br>
      <input type="number" disabled data-bind="value=_component_.apr">%
    </label>
    <label>
      Loan Principal<br>
      <input type="number" disabled data-bind="value=_component_.principal">
    </label>
    <div>
      <span data-bind="text=_component_.num_payments">00</span> payments
    </div>
    <label>
      Monthly Payment</br>
      <input type="number" disabled data-bind="value=_component_.payment">
    </label>

And finally, we need to recalculate when something changes:

    <form data-event="input,change:_component_.calculate">

This requires calculate to be part of our `loan` object, so we'll add it to the
loan object's definition:

    const loan = {
      ...,
      calculate,
    };

```
<style>
  .mortgage-calculator input,
  .mortgage-calculator select {
    width: 120px;
    text-align: right;
  }
  .mortgage-calculator label {
    display: block;
    margin-top: 4px;
  }
</style>
<form class="mortgage-calculator" data-event="input,change:_component_.calculate">
  <label>
    Total Price<br>
    <input type="number" min="0" step="10000" data-bind="value=_component_.total">
  </label>
  <label>
    Deposit<br>
    <input type="number" min="0" step="1" data-bind="value=_component_.deposit">%
  </label>
  <div>
    $<span data-bind="text=_component_.deposit_amount">000.00</span>
  </div>
  <label>
    Loan Type<br>
    <select data-bind="value=_component_.type">
      <option value="0">Interest Only (ARM)</option>
      <option value="30">30 year Fixed</option>
      <option value="20">20 year Fixed</option>
      <option value="15">15 year Fixed</option>
      <option value="10">10 year Fixed</option>
    </select>
  </label>
  <label>
    Interest Rate<br>
    <input type="number" min="0" step="0.05" data-bind="value=_component_.rate">%
  </label>
  <label>
    Interest Rate (APR)<br>
    <input type="number" disabled data-bind="value=_component_.apr">%
  </label>
  <label>
    Loan Principal<br>
    <input type="number" disabled data-bind="value=_component_.principal">
  </label>
  <div>
    <span data-bind="text=_component_.num_payments">00</span> payments
  </div>
  <label>
    Monthly Payment</br>
    <input type="number" disabled data-bind="value=_component_.payment">
  </label>
</form>
<script>
  // the details of calculate aren't really important
  // it uses b8r.get to pull properties from an object registered as 'loan'
  // it uses b8r.set to stick calculated values into loan
  const calculate = () => {
    // in the US, quoted interest rates are a lie, and simply 12x the monthly rate
    const monthly_rate = get('rate') * 0.01 / 12;
    // in case the user wants to the rate that they're actually paying
    set('apr', ((Math.pow(1 + monthly_rate, 12) - 1) * 100).toFixed(2));
    const deposit_amount = get('deposit') * 0.01 * get('total');
    const principal = get('total') - deposit_amount;
    let payment;
    let num_payments;
    if (get('type') === 0) {
      payment = (monthly_rate * principal).toFixed(2);
      num_payments = '∞';
    } else {
      num_payments = get('type') * 12;
      // how much will this loan be worth at the end of the duration?
      const future_principal_value = Math.pow(1 + monthly_rate, num_payments) * principal;
      // how much will a compounded payment of $1 be worth at the end of the duration?
      const future_payment_value = (Math.pow(1 + monthly_rate, num_payments) - 1)/monthly_rate;
      payment = (future_principal_value / future_payment_value).toFixed(2);
    }
    // we'll set the newly calculated values via b8r, so it can update bound elements
    set('deposit_amount', deposit_amount);
    set('payment', payment);
    set('principal', principal);
    set('num_payments', '' + num_payments);
  };

  set({
    total: 100000,
    deposit: 20,
    type: 30,
    rate: 3.95,
    calculate,
  });
  calculate();
</script>
```
*/

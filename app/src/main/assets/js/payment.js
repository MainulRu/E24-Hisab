/* E24 Hisab payment module — shared by Web and Android. */
function e24RenderPaymentSettings() {
  const settings =
    db && db.paymentSettings && typeof db.paymentSettings === "object"
      ? db.paymentSettings
      : {};
  const fields = {
    "e24-pay-bkash-number": "bkashPersonalNumber",
    "e24-pay-nagad-number": "nagadPersonalNumber",
    "e24-pay-bank-name": "bankName",
    "e24-pay-bank-holder": "bankHolder",
    "e24-pay-bank-account": "bankAccount",
    "e24-pay-bank-branch": "bankBranch",
    "e24-pay-bank-routing": "bankRouting",
    "e24-pay-bkash-mode": "bkashAccountType",
    "e24-pay-bkash-merchant": "bkashMerchantId",
    "e24-pay-nagad-mode": "nagadAccountType",
    "e24-pay-nagad-merchant": "nagadMerchantId",
  };
  Object.keys(fields).forEach(function (id) {
    const element = document.getElementById(id);
    if (element) {
      const key = fields[id];
      element.value =
        settings[key] ||
        (key === "bkashAccountType" || key === "nagadAccountType"
          ? "personal"
          : "");
    }
  });
  if (typeof window.e24RenderPaymentPage === "function")
    window.e24RenderPaymentPage();
}
function e24RenderPaymentPage() {
  const settings =
    db && db.paymentSettings && typeof db.paymentSettings === "object"
      ? db.paymentSettings
      : {};
  const customers = Array.isArray(db && db.customers) ? db.customers : [];
  const customerSelect = document.getElementById("e24-payment-customer-select");
  if (customerSelect) {
    const selectedId = db.selectedCustomerId ? String(db.selectedCustomerId) : "";
    customerSelect.textContent = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "গ্রাহক নির্বাচন করুন";
    customerSelect.appendChild(placeholder);
    customers.forEach(function (item) {
      const option = document.createElement("option");
      option.value = String(item.id);
      option.textContent = String(item.name || "নাম নেই") +
        (item.phone ? " — " + String(item.phone) : "");
      customerSelect.appendChild(option);
    });
    customerSelect.value = customers.some(function (item) {
      return String(item.id) === selectedId;
    }) ? selectedId : "";
    if (customerSelect.dataset.bound !== "1") {
      customerSelect.addEventListener("change", function () {
        db.selectedCustomerId = this.value || "";
        e24RenderPaymentPage();
      });
      customerSelect.dataset.bound = "1";
    }
  }
  const customer = db.selectedCustomerId
    ? customers.find(function (item) {
        return String(item.id) === String(db.selectedCustomerId);
      }) || null
    : null;
  const nameElement = document.getElementById("e24-payment-customer-name");
  const phoneElement = document.getElementById("e24-payment-customer-phone");
  const dueElement = document.getElementById("e24-payment-customer-due");
  if (customer) {
    const customerTransactions = (
      Array.isArray(db.transactions) ? db.transactions : []
    ).filter(function (tx) {
      return String(tx.customerId) === String(customer.id);
    });
    let sales = 0,
      paid = 0;
    customerTransactions.forEach(function (tx) {
      if (tx.type === "বাকি") {
        sales += Number(tx.amount) || 0;
        paid += Number(tx.paid) || 0;
      } else if (tx.type === "জমা") {
        paid += Number(tx.amount) || 0;
      }
    });
    const due = Math.max(0, sales - paid);
    const moneyText = "৳ " + due.toLocaleString("en-IN");
    const amountInput = document.getElementById("e24-payment-amount");
    const amountHint = document.getElementById("e24-payment-amount-hint");
    if (amountInput) {
      amountInput.max = String(due);
      amountInput.disabled = due <= 0;
      if (amountInput.dataset.customerId !== String(customer.id)) {
        amountInput.value = due > 0 ? String(due) : "";
        amountInput.dataset.customerId = String(customer.id);
      } else if (Number(amountInput.value) > due) {
        amountInput.value = due > 0 ? String(due) : "";
      }
    }
    if (amountHint)
      amountHint.textContent =
        due > 0
          ? "সর্বোচ্চ ৳ " +
            due.toLocaleString("en-IN") +
            " পর্যন্ত পেমেন্ট করা যাবে।"
          : "এই গ্রাহকের কোনো বকেয়া নেই।";
    if (nameElement)
      nameElement.textContent = String(customer.name || "নাম নেই");
    if (phoneElement)
      phoneElement.textContent = String(customer.phone || "মোবাইল নম্বর নেই");
    if (dueElement) dueElement.textContent = "বকেয়া পরিমাণ: " + moneyText;
  } else {
    const amountInput = document.getElementById("e24-payment-amount");
    const amountHint = document.getElementById("e24-payment-amount-hint");
    if (amountInput) {
      amountInput.value = "";
      amountInput.max = "0";
      amountInput.disabled = true;
      amountInput.dataset.customerId = "";
    }
    if (amountHint)
      amountHint.textContent = "পেমেন্ট করতে উপরের তালিকা থেকে গ্রাহক নির্বাচন করুন।";
    if (nameElement) nameElement.textContent = "গ্রাহক নির্বাচন করা হয়নি";
    if (phoneElement) phoneElement.textContent = "তালিকা থেকে গ্রাহক নির্বাচন করুন";
    if (dueElement) dueElement.textContent = "বকেয়া পরিমাণ: ৳ ০";
  }
  const paymentAction = document.getElementById("e24-payment-submit");
  if (paymentAction) paymentAction.disabled = !customer;
  const values = {
    bkash:
      settings.bkashAccountType === "merchant"
        ? settings.bkashMerchantId
        : settings.bkashPersonalNumber,
    nagad:
      settings.nagadAccountType === "merchant"
        ? settings.nagadMerchantId
        : settings.nagadPersonalNumber,
  };
  const available = {
    bkash: !!String(values.bkash || "").trim(),
    nagad: !!String(values.nagad || "").trim(),
    bank: !!(
      String(settings.bankName || "").trim() &&
      String(settings.bankAccount || "").trim()
    ),
  };
  Object.keys(available).forEach(function (method) {
    const option = document.getElementById("e24-pay-option-" + method);
    if (option) option.hidden = !available[method];
  });
  const radios = Array.from(
    document.querySelectorAll('#e24-payment-method-options input[name="pay"]'),
  );
  const selected = radios.find((r) => r.checked && !r.closest("label")?.hidden);
  if (!selected) {
    const fallback = radios.find((r) => r.value === "cash");
    if (fallback) fallback.checked = true;
  }
  const method = (radios.find((r) => r.checked) || {}).value || "cash";
  const title = document.getElementById("e24-payment-account-title");
  const content = document.getElementById("e24-payment-account-content");
  const details = document.getElementById("e24-payment-account-details");
  if (!title || !content || !details) return;
  const addLine = (label, value) => {
    if (String(value || "").trim()) {
      const line = document.createElement("div");
      line.style.marginTop = "4px";
      line.textContent = label + ": " + String(value).trim();
      content.appendChild(line);
    }
  };
  content.textContent = "";
  if (method === "bkash" || method === "nagad") {
    const provider = method === "bkash" ? "বিকাশ" : "নগদ";
    const accountType =
      settings[method + "AccountType"] === "merchant" ? "Merchant" : "Personal";
    title.textContent = provider + " পেমেন্ট তথ্য";
    addLine("অ্যাকাউন্টের ধরন", accountType);
    addLine("নম্বর / Merchant ID", values[method]);
  } else if (method === "bank") {
    title.textContent = "ব্যাংক পেমেন্ট তথ্য";
    addLine("ব্যাংকের নাম", settings.bankName);
    addLine("হিসাবের নাম", settings.bankHolder);
    addLine("অ্যাকাউন্ট নম্বর", settings.bankAccount);
    addLine("শাখা", settings.bankBranch);
    addLine("রাউটিং নম্বর", settings.bankRouting);
  } else {
    title.textContent = "নগদ টাকা (Cash)";
    addLine("পেমেন্ট তথ্য", "সরাসরি নগদ টাকা গ্রহণ করুন।");
  }
}
window.e24RenderPaymentPage = e24RenderPaymentPage;
async function e24SavePaymentSettings() {
  const paymentContext = window.E24PaymentContext;
  const currentUser = paymentContext && paymentContext.currentUser;
  const activeDataUid = paymentContext && paymentContext.activeDataUid;
  const e24Store = paymentContext && paymentContext.store;
  const showToast = paymentContext && paymentContext.showToast;
  if (!currentUser || !activeDataUid || !e24Store) {
    const message = "লগইন তথ্য পাওয়া যায়নি। আবার লগইন করুন।";
    if (typeof showToast === "function") {
      showToast(message, "error");
    } else {
      const toast = document.getElementById("toast");
      if (toast) {
        toast.textContent = message;
        toast.classList.add("show", "toast-error");
      }
    }
    return;
  }
  const button = document.getElementById("e24-save-payment-settings");
  const fields = {
    bkashPersonalNumber: "e24-pay-bkash-number",
    nagadPersonalNumber: "e24-pay-nagad-number",
    bankName: "e24-pay-bank-name",
    bankHolder: "e24-pay-bank-holder",
    bankAccount: "e24-pay-bank-account",
    bankBranch: "e24-pay-bank-branch",
    bankRouting: "e24-pay-bank-routing",
    bkashAccountType: "e24-pay-bkash-mode",
    bkashMerchantId: "e24-pay-bkash-merchant",
    nagadAccountType: "e24-pay-nagad-mode",
    nagadMerchantId: "e24-pay-nagad-merchant",
  };
  const paymentSettings = {};
  Object.keys(fields).forEach(function (key) {
    const element = document.getElementById(fields[key]);
    paymentSettings[key] = element ? String(element.value || "").trim() : "";
  });
  if (paymentSettings.bkashAccountType !== "merchant")
    paymentSettings.bkashAccountType = "personal";
  if (paymentSettings.nagadAccountType !== "merchant")
    paymentSettings.nagadAccountType = "personal";
  if (button) button.disabled = true;
  try {
    const paymentRef = e24Store
      .collection("users")
      .doc(activeDataUid)
      .collection("data")
      .doc("main");
    await paymentRef.set(
      {
        paymentSettings: paymentSettings,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    const savedSnapshot = await paymentRef.get({ source: "server" });
    const savedData = savedSnapshot.exists ? savedSnapshot.data() || {} : {};
    const savedSettings = savedData.paymentSettings || {};
    const mismatch = Object.keys(paymentSettings).some(function (key) {
      return String(savedSettings[key] || "") !== paymentSettings[key];
    });
    if (mismatch) throw new Error("PAYMENT_SETTINGS_NOT_VERIFIED");
    db.paymentSettings = savedSettings;
    e24RenderPaymentSettings();
    showToast("পেমেন্ট তথ্য সংরক্ষিত হয়েছে");
  } catch (error) {
    console.error("E24 payment settings save failed:", error);
    const message =
      "সংরক্ষণ হয়নি: " +
      (error && error.message ? error.message : "অজানা সমস্যা");
    if (typeof showToast === "function") {
      showToast(message, "error");
    } else {
      const toast = document.getElementById("toast");
      if (toast) {
        toast.textContent = message;
        toast.classList.add("show", "toast-error");
      }
    }
  } finally {
    if (button) button.disabled = false;
  }
}

// Public entry point retained for compatibility with existing Web integrations.
window.e24SavePaymentSettings = e24SavePaymentSettings;

// Use delegated binding because settings pages are inserted dynamically.
function e24BindPaymentSettingsSave() {
  if (document.documentElement.dataset.e24PaymentSaveDelegated === "1") return;
  document.documentElement.dataset.e24PaymentSaveDelegated = "1";
  document.addEventListener("click", function (event) {
    const target = event.target;
    const button =
      target && typeof target.closest === "function"
        ? target.closest("#e24-save-payment-settings")
        : null;
    if (!button) return;
    event.preventDefault();
    e24SavePaymentSettings();
  });
}
e24BindPaymentSettingsSave();

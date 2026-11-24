import { readFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "firebase/firestore";

const PROJECT_ID = "demo-e24-hisab";
const MAIN_ADMIN_UID = "exITNpwyRNaWpoMWpW6BgMcMGbf2";
const env = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8")
  }
});

function db(uid, email = `${uid}@example.test`) {
  return env.authenticatedContext(uid, {
    email,
    email_verified: true
  }).firestore();
}

async function seed() {
  await env.withSecurityRulesDisabled(async context => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, "users/owner/data/main"), {
      cashBalance: 100,
      smsWalletBalance: 10,
      smsHistory: [],
      smsRechargeRequests: [],
      smsWalletTransactions: []
    });
    await setDoc(doc(firestore, "users/other/data/main"), {
      cashBalance: 200,
      smsWalletBalance: 20,
      smsHistory: [],
      smsRechargeRequests: [],
      smsWalletTransactions: []
    });
    await setDoc(doc(firestore, "adminRoles/full-admin"), {
      role: "full",
      active: true
    });
    await setDoc(doc(firestore, "adminRoles/limited-admin"), {
      role: "limited",
      active: true
    });
  });
}

before(async () => {
  await seed();
});

beforeEach(async () => {
  // Each test starts from a clean, known fixture set.
  await env.clearFirestore();
  await seed();
});

after(async () => {
  await env.cleanup();
});

test("owner can read own ledger but cannot read another user's ledger", async () => {
  await assertSucceeds(getDoc(doc(db("owner"), "users/owner/data/main")));
  await assertFails(getDoc(doc(db("owner"), "users/other/data/main")));
});

test("owner may update ordinary ledger fields", async () => {
  await assertSucceeds(updateDoc(
    doc(db("owner"), "users/owner/data/main"),
    { cashBalance: 125 }
  ));
});

test("owner cannot change server-owned wallet or recharge fields", async () => {
  const ownerDb = db("owner");
  const mainRef = doc(ownerDb, "users/owner/data/main");
  await assertFails(updateDoc(mainRef, { smsWalletBalance: 999 }));
  await assertFails(updateDoc(mainRef, { smsHistory: [{ amount: 5 }] }));
  await assertFails(updateDoc(mainRef, { smsRechargeRequests: [{ amount: 50 }] }));
  await assertFails(updateDoc(mainRef, { smsWalletTransactions: [{ amount: 5 }] }));
});

test("new owner main ledger must start with zero wallet and empty financial arrays", async () => {
  const ownerDb = db("new-owner");
  await assertSucceeds(setDoc(doc(ownerDb, "users/new-owner/data/main"), {
    cashBalance: 0,
    smsWalletBalance: 0,
    smsHistory: [],
    smsRechargeRequests: [],
    smsWalletTransactions: []
  }));
  const badDb = db("bad-owner");
  await assertFails(setDoc(doc(badDb, "users/bad-owner/data/main"), {
    cashBalance: 0,
    smsWalletBalance: 500,
    smsHistory: [],
    smsRechargeRequests: [],
    smsWalletTransactions: []
  }));
});

test("client cannot access server-owned recharge and idempotency records", async () => {
  const ownerDb = db("owner");
  await assertFails(getDoc(doc(ownerDb, "users/owner/rechargeRequests/request-1")));
  await assertFails(setDoc(doc(ownerDb, "users/owner/rechargeRequests/request-1"), {
    amount: 50
  }));
  await assertFails(setDoc(doc(ownerDb, "e24RechargeTransactionIndex/hash-1"), {
    uid: "owner"
  }));
  await assertFails(setDoc(doc(ownerDb, "e24SmsDebitEvents/event-1"), {
    uid: "owner"
  }));
  await assertFails(setDoc(doc(ownerDb, "e24PaymentSessions/session-1"), {
    uid: "owner"
  }));
  await assertFails(setDoc(doc(ownerDb, "e24ReferralRewards/owner"), {
    amount: 5
  }));
});

test("Full Admin can read another user's ledger but cannot edit it", async () => {
  const fullDb = db("full-admin");
  await assertSucceeds(getDoc(doc(fullDb, "users/other/data/main")));
  await assertFails(updateDoc(
    doc(fullDb, "users/other/data/main"),
    { cashBalance: 999 }
  ));
});

test("Limited Admin cannot read another user's ledger", async () => {
  const limitedDb = db("limited-admin");
  await assertFails(getDoc(doc(limitedDb, "users/other/data/main")));
});

test("Main Admin can perform server-reserved wallet corrections", async () => {
  const adminDb = db(MAIN_ADMIN_UID, "mainul.ru.ac.bd@gmail.com");
  await assertSucceeds(updateDoc(
    doc(adminDb, "users/owner/data/main"),
    { smsWalletBalance: 75, smsHistory: [{ amount: 5 }] }
  ));
});

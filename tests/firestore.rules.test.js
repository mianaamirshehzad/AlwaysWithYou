/**
 * Firestore security-rules test suite.
 *
 * These tests run against the Firebase Emulator Suite, so they exercise the
 * real rules engine rather than a re-implementation of it.
 *
 * Run with:  npm run test:rules
 */
const fs = require('fs');
const path = require('path');
const { serverTimestamp } = require('firebase/firestore');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');

const RULES = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
const PROJECT_ID = 'demo-alwayswithyou-rules';

const CAREGIVER = 'caregiver-uid';
const PARENT = 'parent-uid';
const OTHER_PARENT = 'other-parent-uid';
const OTHER_CAREGIVER = 'other-caregiver-uid';
const STRANGER = 'stranger-uid';

const REL_ID = `${CAREGIVER}_${PARENT}`;

function ts(msOffset = 0) {
  return new Date(Date.now() + msOffset);
}

let testEnv;

function dbFor(uid, options = {}) {
  return testEnv.authenticatedContext(uid, options).firestore();
}

/**
 * Runs `fn` with an unrestricted Firestore client. The client returned by
 * `withSecurityRulesDisabled` is terminated when the callback returns, so the
 * privileged handle must never escape it.
 */
function admin(fn) {
  return testEnv.withSecurityRulesDisabled((context) => fn(context.firestore()));
}

async function seedBase() {
  await admin(async (db) => {
    await db.doc(`users/${CAREGIVER}`).set({
      role: 'child',
      name: 'Caregiver',
      email: 'caregiver@example.com',
      createdAt: ts(),
    });
    await db.doc(`users/${PARENT}`).set({
      role: 'parent',
      name: 'Parent',
      email: 'parent@example.com',
      createdAt: ts(),
    });
    await db.doc(`users/${OTHER_PARENT}`).set({
      role: 'parent',
      name: 'Other Parent',
      email: 'other-parent@example.com',
      createdAt: ts(),
    });
    await db.doc(`users/${OTHER_CAREGIVER}`).set({
      role: 'child',
      name: 'Other Caregiver',
      email: 'other-caregiver@example.com',
      createdAt: ts(),
    });
    await db.doc(`users/${STRANGER}`).set({
      role: 'parent',
      name: 'Stranger',
      email: 'stranger@example.com',
      createdAt: ts(),
    });

    await db.doc(`relationships/${REL_ID}`).set({
      id: REL_ID,
      childId: CAREGIVER,
      parentId: PARENT,
      invitationCode: '123456',
      status: 'active',
      createdAt: ts(),
      updatedAt: ts(),
    });
  });
}

async function seedInvitation(code, overrides = {}) {
  await admin((db) =>
    db.doc(`invitations/${code}`).set({
      childUid: CAREGIVER,
      code,
      createdAt: ts(),
      expiresAt: ts(60 * 60 * 1000),
      status: 'pending',
      ...overrides,
    })
  );
}

async function seedTask(overrides = {}) {
  const task = {
    id: 'task-1',
    relationshipId: REL_ID,
    createdBy: CAREGIVER,
    assignedTo: PARENT,
    type: 'medicine',
    title: 'Morning meds',
    note: '',
    description: '',
    scheduledTime: '09:00',
    frequency: 'daily',
    startDate: '2026-01-01',
    active: true,
    createdAt: ts(),
    updatedAt: ts(),
    ...overrides,
  };
  await admin((db) => db.doc(`careTasks/${task.id}`).set(task));
  return task;
}

async function seedOccurrence(overrides = {}) {
  const occ = {
    id: 'task-1_2026-01-01',
    taskId: 'task-1',
    relationshipId: REL_ID,
    parentId: PARENT,
    childId: CAREGIVER,
    title: 'Morning meds',
    type: 'medicine',
    note: '',
    scheduledDate: '2026-01-01',
    scheduledTime: '09:00',
    status: 'pending',
    createdAt: ts(),
    updatedAt: ts(),
    ...overrides,
  };
  await admin((db) => db.doc(`taskOccurrences/${occ.id}`).set(occ));
  return occ;
}

/** Sets a relationship status directly, bypassing the rules. */
function setRelationshipStatus(status) {
  return admin((db) => db.doc(`relationships/${REL_ID}`).set({ status }, { merge: true }));
}

/** Creates a message directly, bypassing the rules. */
function seedMessage(overrides = {}) {
  return admin(async (db) => {
    const ref = await db.collection('messages').add({
      conversationId: REL_ID,
      senderId: PARENT,
      text: 'Hello',
      messageType: 'text',
      status: 'sent',
      createdAt: serverTimestamp(),
      ...overrides,
    });
    return ref.id;
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8087,
      rules: RULES,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedBase();
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
describe('users collection', () => {
  it('denies every read to an unauthenticated caller', async () => {
    await assertFails(testEnv.unauthenticatedContext().firestore().doc(`users/${CAREGIVER}`).get());
  });

  it('allows a user to read their own profile', async () => {
    await assertSucceeds(dbFor(PARENT).doc(`users/${PARENT}`).get());
  });

  it('allows linked counterparts to read each other profile', async () => {
    await assertSucceeds(dbFor(CAREGIVER).doc(`users/${PARENT}`).get());
    await assertSucceeds(dbFor(PARENT).doc(`users/${CAREGIVER}`).get());
  });

  it('denies reading an unrelated profile', async () => {
    await assertFails(dbFor(PARENT).doc(`users/${OTHER_PARENT}`).get());
    await assertFails(dbFor(PARENT).doc(`users/${STRANGER}`).get());
  });

  it('denies enumerating the user collection (UID discovery)', async () => {
    await assertFails(dbFor(PARENT).collection('users').get());
  });

  it('allows a user to create their own profile with a valid role', async () => {
    await assertSucceeds(
      dbFor('brand-new-user', { email: 'brand-new-user' }).doc('users/brand-new-user').set({
        role: 'parent',
        name: 'New',
        email: 'brand-new-user',
        createdAt: ts(),
      })
    );
  });

  it('denies creating a profile for somebody else', async () => {
    await assertFails(
      dbFor(PARENT).doc(`users/${STRANGER}`).set({
        role: 'parent',
        name: 'Evil',
        email: 'stranger@example.com',
        createdAt: ts(),
      })
    );
  });

  it('denies creating a profile with an elevated role', async () => {
    await assertFails(
      dbFor('brand-new-user', { email: 'brand-new-user' }).doc('users/brand-new-user').set({
        role: 'admin',
        name: 'Escalated',
        email: 'brand-new-user',
        createdAt: ts(),
      })
    );
  });

  it('denies creating a profile with a forged email', async () => {
    await assertFails(
      dbFor('brand-new-user', { email: 'brand-new-user' }).doc('users/brand-new-user').set({
        role: 'parent',
        name: 'Forged',
        email: 'victim@example.com',
        createdAt: ts(),
      })
    );
  });

  it('allows a user to update their own display fields', async () => {
    await assertSucceeds(
      dbFor(PARENT).doc(`users/${PARENT}`).set(
        { name: 'Renamed', phone: '+10000000000', updatedAt: ts() },
        { merge: true }
      )
    );
  });

  it('denies a user elevating their own role', async () => {
    await assertFails(
      dbFor(PARENT).doc(`users/${PARENT}`).set({ role: 'child' }, { merge: true })
    );
  });

  it('denies a user changing their email', async () => {
    await assertFails(
      dbFor(PARENT).doc(`users/${PARENT}`).set({ email: 'attacker@evil.com' }, { merge: true })
    );
  });

  it('denies a user updating another profile', async () => {
    await assertFails(
      dbFor(PARENT).doc(`users/${STRANGER}`).set({ name: 'Owned' }, { merge: true })
    );
  });

  it('scopes subcollection settings to the owner', async () => {
    await assertSucceeds(
      dbFor(PARENT).doc(`users/${PARENT}/settings/preferences`).set({ soundEnabled: false })
    );
    await assertFails(
      dbFor(PARENT).doc(`users/${STRANGER}/settings/preferences`).get()
    );
  });
});

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------
describe('invitations collection', () => {
  it('allows a caregiver to create a pending six digit invitation', async () => {
    await assertSucceeds(
      dbFor(CAREGIVER).doc('invitations/424242').set({
        childUid: CAREGIVER,
        code: '424242',
        createdAt: ts(),
        expiresAt: ts(60000),
        status: 'pending',
      })
    );
  });

  it('denies a parent creating an invitation', async () => {
    await assertFails(
      dbFor(PARENT).doc('invitations/424243').set({
        childUid: PARENT,
        code: '424243',
        createdAt: ts(),
        expiresAt: ts(60000),
        status: 'pending',
      })
    );
  });

  it('denies creating an invitation owned by somebody else', async () => {
    await assertFails(
      dbFor(CAREGIVER).doc('invitations/424244').set({
        childUid: OTHER_CAREGIVER,
        code: '424244',
        createdAt: ts(),
        expiresAt: ts(60000),
        status: 'pending',
      })
    );
  });

  it('denies a non six digit invitation code', async () => {
    await assertFails(
      dbFor(CAREGIVER).doc('invitations/abcdef').set({
        childUid: CAREGIVER,
        code: 'abcdef',
        createdAt: ts(),
        expiresAt: ts(60000),
        status: 'pending',
      })
    );
  });

  it('denies an already expired invitation at creation time', async () => {
    await assertFails(
      dbFor(CAREGIVER).doc('invitations/424245').set({
        childUid: CAREGIVER,
        code: '424245',
        createdAt: ts(),
        expiresAt: ts(-60000),
        status: 'pending',
      })
    );
  });

  it('allows the issuer to read and list their own invitations', async () => {
    await seedInvitation('111111');
    await assertSucceeds(dbFor(CAREGIVER).doc('invitations/111111').get());
    await assertSucceeds(
      dbFor(CAREGIVER)
        .collection('invitations')
        .where('childUid', '==', CAREGIVER)
        .where('status', '==', 'pending')
        .get()
    );
  });

  it('does not let an unrelated user read or enumerate invitations', async () => {
    await seedInvitation('111111');
    await assertFails(dbFor(PARENT).doc('invitations/111111').get());
    await assertFails(dbFor(PARENT).collection('invitations').get());
  });

  it('allows a parent to redeem a pending invitation (atomic claim)', async () => {
    await seedInvitation('123456');
    await assertSucceeds(
      dbFor(PARENT).doc('invitations/123456').set(
        { status: 'consumed', parentUid: PARENT, consumedAt: ts() },
        { merge: true }
      )
    );
  });

  it('denies redeeming an expired invitation', async () => {
    await seedInvitation('123457', { expiresAt: ts(-1000) });
    await assertFails(
      dbFor(PARENT).doc('invitations/123457').set(
        { status: 'consumed', parentUid: PARENT, consumedAt: ts() },
        { merge: true }
      )
    );
  });

  it('denies redeeming an already consumed invitation', async () => {
    await seedInvitation('123458', { status: 'consumed', parentUid: OTHER_PARENT });
    await assertFails(
      dbFor(PARENT).doc('invitations/123458').set(
        { status: 'consumed', parentUid: PARENT, consumedAt: ts() },
        { merge: true }
      )
    );
  });

  it('denies self redemption by the issuing caregiver', async () => {
    await seedInvitation('123459');
    await assertFails(
      dbFor(CAREGIVER).doc('invitations/123459').set(
        { status: 'consumed', parentUid: CAREGIVER, consumedAt: ts() },
        { merge: true }
      )
    );
  });

  it('denies the issuer reviving a consumed invitation (single use)', async () => {
    await seedInvitation('123460', { status: 'consumed', parentUid: PARENT });
    await assertFails(
      dbFor(CAREGIVER).doc('invitations/123460').set(
        { status: 'pending', parentUid: null, consumedAt: null },
        { merge: true }
      )
    );
  });

  it('denies the issuer re-pointing a consumed invitation at another parent', async () => {
    await seedInvitation('123461', { status: 'consumed', parentUid: PARENT });
    await assertFails(
      dbFor(CAREGIVER).doc('invitations/123461').set(
        { parentUid: STRANGER },
        { merge: true }
      )
    );
  });

  it('denies extending the expiry of a pending invitation', async () => {
    await seedInvitation('123462');
    await assertFails(
      dbFor(CAREGIVER).doc('invitations/123462').set(
        { expiresAt: ts(30 * 24 * 60 * 60 * 1000) },
        { merge: true }
      )
    );
  });

  it('denies a second concurrent redemption of the same code', async () => {
    await seedInvitation('123463');
    // Both parents try to claim at the same time; exactly one may win.
    const results = await Promise.allSettled([
      dbFor(PARENT).doc('invitations/123463').set(
        { status: 'consumed', parentUid: PARENT, consumedAt: ts() },
        { merge: true }
      ),
      dbFor(OTHER_PARENT).doc('invitations/123463').set(
        { status: 'consumed', parentUid: OTHER_PARENT, consumedAt: ts() },
        { merge: true }
      ),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  });

  it('denies deleting an invitation', async () => {
    await seedInvitation('123464');
    await assertFails(dbFor(CAREGIVER).doc('invitations/123464').delete());
  });
});

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------
describe('relationships collection', () => {
  it('allows participants to read the relationship', async () => {
    await assertSucceeds(dbFor(PARENT).doc(`relationships/${REL_ID}`).get());
    await assertSucceeds(dbFor(CAREGIVER).doc(`relationships/${REL_ID}`).get());
  });

  it('denies an unrelated user reading the relationship', async () => {
    await assertFails(dbFor(STRANGER).doc(`relationships/${REL_ID}`).get());
    await assertFails(dbFor(OTHER_PARENT).doc(`relationships/${REL_ID}`).get());
  });

  it('allows participants to run the scoped relationship query', async () => {
    await assertSucceeds(
      dbFor(CAREGIVER)
        .collection('relationships')
        .where('childId', '==', CAREGIVER)
        .where('status', '==', 'active')
        .get()
    );
    await assertSucceeds(
      dbFor(PARENT)
        .collection('relationships')
        .where('parentId', '==', PARENT)
        .where('status', '==', 'active')
        .get()
    );
  });

  it('denies an unscoped relationship listing', async () => {
    await assertFails(dbFor(STRANGER).collection('relationships').get());
  });

  it('allows a parent to create a relationship for a code they redeemed', async () => {
    await seedInvitation('555555', { status: 'consumed', parentUid: 'newparent' });
    const id = `${CAREGIVER}_newparent`;
    await admin((db) =>
      db.doc('users/newparent').set({
        role: 'parent',
        name: 'New Parent',
        email: 'newparent',
        createdAt: ts(),
      })
    );
    await assertSucceeds(
      dbFor('newparent').doc(`relationships/${id}`).set({
        id,
        childId: CAREGIVER,
        parentId: 'newparent',
        invitationCode: '555555',
        status: 'active',
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
  });

  it('denies forging a relationship with an arbitrary caregiver UID', async () => {
    await assertFails(
      dbFor(STRANGER).doc(`relationships/${OTHER_CAREGIVER}_${STRANGER}`).set({
        id: `${OTHER_CAREGIVER}_${STRANGER}`,
        childId: OTHER_CAREGIVER,
        parentId: STRANGER,
        invitationCode: '999999',
        status: 'active',
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
  });

  it('denies reusing a code that was never redeemed by the caller', async () => {
    await seedInvitation('666666', { status: 'consumed', parentUid: OTHER_PARENT });
    const id = `${CAREGIVER}_${STRANGER}`;
    await assertFails(
      dbFor(STRANGER).doc(`relationships/${id}`).set({
        id,
        childId: CAREGIVER,
        parentId: STRANGER,
        invitationCode: '666666',
        status: 'active',
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
  });

  it('denies a relationship id that does not follow the childId_parentId convention', async () => {
    await seedInvitation('777777', { status: 'consumed', parentUid: STRANGER });
    await assertFails(
      dbFor(STRANGER).doc('relationships/forged-id').set({
        id: 'forged-id',
        childId: CAREGIVER,
        parentId: STRANGER,
        invitationCode: '777777',
        status: 'active',
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
  });

  it('denies a caregiver creating a relationship on the parent behalf', async () => {
    await assertFails(
      dbFor(CAREGIVER).doc(`relationships/${CAREGIVER}_someone`).set({
        id: `${CAREGIVER}_someone`,
        childId: CAREGIVER,
        parentId: 'someone',
        status: 'active',
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
  });

  it('allows a participant to deactivate and reactivate', async () => {
    await assertSucceeds(
      dbFor(PARENT).doc(`relationships/${REL_ID}`).set(
        { status: 'inactive' },
        { merge: true }
      )
    );
    await assertSucceeds(
      dbFor(PARENT).doc(`relationships/${REL_ID}`).set({ status: 'active' }, { merge: true })
    );
  });

  it('denies a participant re-pointing the relationship at another user', async () => {
    await assertFails(
      dbFor(CAREGIVER).doc(`relationships/${REL_ID}`).set(
        { parentId: STRANGER },
        { merge: true }
      )
    );
  });

  it('denies an invalid status transition', async () => {
    await assertFails(
      dbFor(PARENT).doc(`relationships/${REL_ID}`).set({ status: 'deleted' }, { merge: true })
    );
  });

  it('denies an unrelated user mutating the relationship', async () => {
    await assertFails(
      dbFor(STRANGER).doc(`relationships/${REL_ID}`).set(
        { status: 'inactive' },
        { merge: true }
      )
    );
    await assertFails(dbFor(STRANGER).doc(`relationships/${REL_ID}`).delete());
  });
});

// ---------------------------------------------------------------------------
// Care tasks
// ---------------------------------------------------------------------------
describe('careTasks collection', () => {
  it('allows participants to read the task', async () => {
    await seedTask();
    await assertSucceeds(dbFor(PARENT).doc('careTasks/task-1').get());
    await assertSucceeds(dbFor(CAREGIVER).doc('careTasks/task-1').get());
  });

  it('denies an unrelated user reading the task', async () => {
    await seedTask();
    await assertFails(dbFor(STRANGER).doc('careTasks/task-1').get());
    await assertFails(dbFor(OTHER_PARENT).doc('careTasks/task-1').get());
  });

  it('allows the scoped task query for both participants', async () => {
    await seedTask();
    await assertSucceeds(
      dbFor(CAREGIVER)
        .collection('careTasks')
        .where('relationshipId', '==', REL_ID)
        .where('active', '==', true)
        .get()
    );
    await assertSucceeds(
      dbFor(PARENT)
        .collection('careTasks')
        .where('relationshipId', '==', REL_ID)
        .where('active', '==', true)
        .get()
    );
  });

  it('denies an unrelated user running the scoped task query', async () => {
    await seedTask();
    await assertFails(
      dbFor(STRANGER)
        .collection('careTasks')
        .where('relationshipId', '==', REL_ID)
        .where('active', '==', true)
        .get()
    );
  });

  it('allows the caregiver to create a valid task', async () => {
    await assertSucceeds(
      dbFor(CAREGIVER).doc('careTasks/new-task').set({
        id: 'new-task',
        relationshipId: REL_ID,
        createdBy: CAREGIVER,
        assignedTo: PARENT,
        type: 'medicine',
        title: 'Morning meds',
        scheduledTime: '09:00',
        frequency: 'daily',
        startDate: '2026-01-01',
        active: true,
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
  });

  it('denies a parent creating a task', async () => {
    await assertFails(
      dbFor(PARENT).doc('careTasks/new-task').set({
        id: 'new-task',
        relationshipId: REL_ID,
        createdBy: PARENT,
        assignedTo: PARENT,
        type: 'medicine',
        title: 'Sneaky',
        scheduledTime: '09:00',
        frequency: 'daily',
        startDate: '2026-01-01',
        active: true,
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
  });

  it('denies a caregiver creating a task for an unrelated parent', async () => {
    await assertFails(
      dbFor(CAREGIVER).doc('careTasks/bad-task').set({
        id: 'bad-task',
        relationshipId: REL_ID,
        createdBy: CAREGIVER,
        assignedTo: OTHER_PARENT,
        type: 'medicine',
        title: 'Not mine',
        scheduledTime: '09:00',
        frequency: 'daily',
        startDate: '2026-01-01',
        active: true,
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
  });

  it('denies a task pointing at a nonexistent relationship', async () => {
    await assertFails(
      dbFor(CAREGIVER).doc('careTasks/bad-task').set({
        id: 'bad-task',
        relationshipId: `${CAREGIVER}_ghost`,
        createdBy: CAREGIVER,
        assignedTo: 'ghost',
        type: 'medicine',
        title: 'Ghost',
        scheduledTime: '09:00',
        frequency: 'daily',
        startDate: '2026-01-01',
        active: true,
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
  });

  it('denies an invalid scheduled time', async () => {
    await assertFails(
      dbFor(CAREGIVER).doc('careTasks/bad-time').set({
        id: 'bad-time',
        relationshipId: REL_ID,
        createdBy: CAREGIVER,
        assignedTo: PARENT,
        type: 'medicine',
        title: 'Bad time',
        scheduledTime: '99:99',
        frequency: 'daily',
        startDate: '2026-01-01',
        active: true,
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
  });

  it('denies an unknown task type', async () => {
    await assertFails(
      dbFor(CAREGIVER).doc('careTasks/bad-type').set({
        id: 'bad-type',
        relationshipId: REL_ID,
        createdBy: CAREGIVER,
        assignedTo: PARENT,
        type: 'mind-reading',
        title: 'Bad type',
        scheduledTime: '09:00',
        frequency: 'daily',
        startDate: '2026-01-01',
        active: true,
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
  });

  it('denies a task created against a revoked relationship', async () => {
    await setRelationshipStatus('inactive');
    await assertFails(
      dbFor(CAREGIVER).doc('careTasks/blocked').set({
        id: 'blocked',
        relationshipId: REL_ID,
        createdBy: CAREGIVER,
        assignedTo: PARENT,
        type: 'medicine',
        title: 'Blocked',
        scheduledTime: '09:00',
        frequency: 'daily',
        startDate: '2026-01-01',
        active: true,
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
  });

  it('allows the caregiver to edit and pause their own task', async () => {
    await seedTask();
    await assertSucceeds(
      dbFor(CAREGIVER).doc('careTasks/task-1').set(
        { title: 'Evening meds', active: false, updatedAt: ts() },
        { merge: true }
      )
    );
  });

  it('denies a parent editing a task', async () => {
    await seedTask();
    await assertFails(
      dbFor(PARENT).doc('careTasks/task-1').set(
        { title: 'Rewritten', updatedAt: ts() },
        { merge: true }
      )
    );
  });

  it('denies taking ownership of a task through an update', async () => {
    await seedTask();
    // A parent can never rewrite the creator or the assignee.
    await assertFails(
      dbFor(PARENT).doc('careTasks/task-1').set({ createdBy: PARENT }, { merge: true })
    );
    await assertFails(
      dbFor(PARENT).doc('careTasks/task-1').set(
        { assignedTo: OTHER_PARENT },
        { merge: true }
      )
    );
    // The caregiver can edit content, but not the participants.
    await assertFails(
      dbFor(CAREGIVER).doc('careTasks/task-1').set(
        { assignedTo: OTHER_PARENT },
        { merge: true }
      )
    );
    await assertFails(
      dbFor(CAREGIVER).doc('careTasks/task-1').set(
        { relationshipId: `${OTHER_CAREGIVER}_${PARENT}` },
        { merge: true }
      )
    );
  });

  it('denies an unrelated user deleting a task', async () => {
    await seedTask();
    await assertFails(dbFor(STRANGER).doc('careTasks/task-1').delete());
  });
});

// ---------------------------------------------------------------------------
// Task occurrences
// ---------------------------------------------------------------------------
describe('taskOccurrences collection', () => {
  it('allows both participants to read an occurrence', async () => {
    await seedOccurrence();
    await assertSucceeds(dbFor(PARENT).doc('taskOccurrences/task-1_2026-01-01').get());
    await assertSucceeds(dbFor(CAREGIVER).doc('taskOccurrences/task-1_2026-01-01').get());
  });

  it('denies an unrelated parent reading another parents occurrence', async () => {
    await seedOccurrence();
    await assertFails(dbFor(OTHER_PARENT).doc('taskOccurrences/task-1_2026-01-01').get());
    await assertFails(dbFor(STRANGER).doc('taskOccurrences/task-1_2026-01-01').get());
  });

  it('supports the dashboard occurrence query shapes', async () => {
    await seedOccurrence();
    await assertSucceeds(
      dbFor(PARENT)
        .collection('taskOccurrences')
        .where('parentId', '==', PARENT)
        .where('scheduledDate', '==', '2026-01-01')
        .get()
    );
    await assertSucceeds(
      dbFor(PARENT)
        .collection('taskOccurrences')
        .where('parentId', '==', PARENT)
        .where('scheduledDate', '>=', '2026-01-01')
        .where('scheduledDate', '<=', '2026-01-02')
        .get()
    );
  });

  it('denies an unrelated user running the dashboard occurrence query', async () => {
    await seedOccurrence();
    await assertFails(
      dbFor(OTHER_PARENT)
        .collection('taskOccurrences')
        .where('parentId', '==', PARENT)
        .where('scheduledDate', '==', '2026-01-01')
        .get()
    );
  });

  it('allows the caregiver to generate an occurrence', async () => {
    await seedTask();
    await assertSucceeds(
      dbFor(CAREGIVER).doc('taskOccurrences/task-1_2026-01-02').set({
        id: 'task-1_2026-01-02',
        taskId: 'task-1',
        relationshipId: REL_ID,
        parentId: PARENT,
        childId: CAREGIVER,
        title: 'Morning meds',
        type: 'medicine',
        note: '',
        scheduledDate: '2026-01-02',
        scheduledTime: '09:00',
        status: 'pending',
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
  });

  it('denies generating an occurrence for somebody elses relationship', async () => {
    await assertFails(
      dbFor(CAREGIVER).doc('taskOccurrences/forged').set({
        id: 'forged',
        taskId: 'task-1',
        relationshipId: REL_ID,
        parentId: OTHER_PARENT,
        childId: CAREGIVER,
        title: 'Forged',
        type: 'medicine',
        scheduledDate: '2026-01-02',
        scheduledTime: '09:00',
        status: 'pending',
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
  });

  it('allows the parent to acknowledge their own occurrence', async () => {
    await seedOccurrence();
    await assertSucceeds(
      dbFor(PARENT).doc('taskOccurrences/task-1_2026-01-01').set(
        { status: 'completed', completedAt: serverTimestamp(), completedBy: PARENT, updatedAt: ts() },
        { merge: true }
      )
    );
  });

  it('allows a late acknowledgment of a missed occurrence', async () => {
    await seedOccurrence({ status: 'missed', escalatedAt: ts(), escalatedTo: CAREGIVER });
    await assertSucceeds(
      dbFor(PARENT).doc('taskOccurrences/task-1_2026-01-01').set(
        { status: 'completed', completedAt: serverTimestamp(), completedBy: PARENT, updatedAt: ts() },
        { merge: true }
      )
    );
  });

  it('allows a snooze that increments the counter exactly once', async () => {
    await seedOccurrence();
    await assertSucceeds(
      dbFor(PARENT).doc('taskOccurrences/task-1_2026-01-01').set(
        { status: 'snoozed', snoozedUntil: ts(900000), snoozeCount: 1, updatedAt: ts() },
        { merge: true }
      )
    );
  });

  it('denies a snooze that skips the snooze counter', async () => {
    await seedOccurrence({ status: 'snoozed', snoozedUntil: ts(900000), snoozeCount: 1 });
    await assertFails(
      dbFor(PARENT).doc('taskOccurrences/task-1_2026-01-01').set(
        { status: 'snoozed', snoozedUntil: ts(900000), snoozeCount: 9, updatedAt: ts() },
        { merge: true }
      )
    );
  });

  it('denies a parent acknowledging on somebody elses behalf', async () => {
    await seedOccurrence();
    await assertFails(
      dbFor(PARENT).doc('taskOccurrences/task-1_2026-01-01').set(
        { status: 'completed', completedAt: serverTimestamp(), completedBy: OTHER_PARENT, updatedAt: ts() },
        { merge: true }
      )
    );
  });

  it('denies a parent acknowledging a cancelled occurrence through a stale screen', async () => {
    await seedOccurrence({ status: 'cancelled' });
    await assertFails(
      dbFor(PARENT).doc('taskOccurrences/task-1_2026-01-01').set(
        { status: 'completed', completedAt: serverTimestamp(), completedBy: PARENT, updatedAt: ts() },
        { merge: true }
      )
    );
  });

  it('denies a parent cancelling their own occurrence', async () => {
    await seedOccurrence();
    await assertFails(
      dbFor(PARENT).doc('taskOccurrences/task-1_2026-01-01').set(
        { status: 'cancelled', updatedAt: ts() },
        { merge: true }
      )
    );
  });

  it('denies forging acknowledgment timestamps', async () => {
    await seedOccurrence();
    await assertFails(
      dbFor(PARENT).doc('taskOccurrences/task-1_2026-01-01').set(
        {
          status: 'completed',
          completedAt: ts(-100000),
          completedBy: PARENT,
          updatedAt: ts(),
        },
        { merge: true }
      )
    );
  });

  it('denies a parent fabricating escalation metadata', async () => {
    await seedOccurrence();
    await assertFails(
      dbFor(PARENT).doc('taskOccurrences/task-1_2026-01-01').set(
        {
          status: 'completed',
          completedAt: serverTimestamp(),
          completedBy: PARENT,
          escalatedAt: ts(),
          escalatedTo: STRANGER,
          escalationStage: 5,
          updatedAt: ts(),
        },
        { merge: true }
      )
    );
  });

  it('denies rewriting occurrence identity fields', async () => {
    await seedOccurrence();
    await assertFails(
      dbFor(PARENT).doc('taskOccurrences/task-1_2026-01-01').set(
        { status: 'completed', completedAt: serverTimestamp(), completedBy: PARENT, parentId: OTHER_PARENT },
        { merge: true }
      )
    );
    await assertFails(
      dbFor(PARENT).doc('taskOccurrences/task-1_2026-01-01').set(
        { status: 'completed', completedAt: serverTimestamp(), completedBy: PARENT, relationshipId: REL_ID + 'x' },
        { merge: true }
      )
    );
  });

  it('allows the caregiver to cancel a pending occurrence', async () => {
    await seedOccurrence();
    await assertSucceeds(
      dbFor(CAREGIVER).doc('taskOccurrences/task-1_2026-01-01').set(
        { status: 'cancelled', updatedAt: ts() },
        { merge: true }
      )
    );
  });

  it('allows the caregiver to record a missed occurrence with escalation metadata', async () => {
    await seedOccurrence();
    await assertSucceeds(
      dbFor(CAREGIVER).doc('taskOccurrences/task-1_2026-01-01').set(
        {
          status: 'missed',
          escalatedAt: ts(),
          escalatedTo: CAREGIVER,
          escalationStage: 1,
          escalationDeliveryStatus: 'pending',
          updatedAt: ts(),
        },
        { merge: true }
      )
    );
  });

  it('denies the caregiver rewriting an acknowledgment', async () => {
    await seedOccurrence({ status: 'completed', completedAt: serverTimestamp(), completedBy: PARENT });
    await assertFails(
      dbFor(CAREGIVER).doc('taskOccurrences/task-1_2026-01-01').set(
        { status: 'pending', completedBy: CAREGIVER },
        { merge: true }
      )
    );
  });

  it('denies an unrelated user updating an occurrence', async () => {
    await seedOccurrence();
    await assertFails(
      dbFor(OTHER_PARENT).doc('taskOccurrences/task-1_2026-01-01').set(
        { status: 'completed', completedAt: serverTimestamp(), completedBy: OTHER_PARENT },
        { merge: true }
      )
    );
    await assertFails(dbFor(STRANGER).doc('taskOccurrences/task-1_2026-01-01').delete());
  });

  it('denies occurrence writes once the relationship is revoked', async () => {
    await seedOccurrence();
    await setRelationshipStatus('inactive');
    await assertFails(
      dbFor(PARENT).doc('taskOccurrences/task-1_2026-01-01').set(
        { status: 'completed', completedAt: serverTimestamp(), completedBy: PARENT, updatedAt: ts() },
        { merge: true }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Conversations and messages
// ---------------------------------------------------------------------------
describe('conversations and messages collections', () => {
  beforeEach(async () => {
    await admin((db) =>
      db.doc(`conversations/${REL_ID}`).set({
        id: REL_ID,
        relationshipId: REL_ID,
        createdAt: ts(),
      })
    );
  });

  it('allows participants to read their conversation', async () => {
    await assertSucceeds(dbFor(PARENT).doc(`conversations/${REL_ID}`).get());
    await assertFails(dbFor(STRANGER).doc(`conversations/${REL_ID}`).get());
  });

  it('allows a participant to open a conversation for their relationship', async () => {
    await assertSucceeds(
      dbFor(PARENT).doc(`conversations/${REL_ID}`).set({
        id: REL_ID,
        relationshipId: REL_ID,
        createdAt: ts(),
      })
    );
  });

  it('denies opening a conversation for an unrelated relationship id', async () => {
    await assertFails(
      dbFor(STRANGER).doc('conversations/not-my-relationship').set({
        id: 'not-my-relationship',
        relationshipId: 'not-my-relationship',
        createdAt: ts(),
      })
    );
  });

  it('allows a participant to send a message', async () => {
    await assertSucceeds(
      dbFor(PARENT).collection('messages').add({
        conversationId: REL_ID,
        senderId: PARENT,
        text: 'Thanks!',
        messageType: 'text',
        status: 'sent',
        createdAt: serverTimestamp(),
      })
    );
  });

  it('denies impersonating another sender', async () => {
    await assertFails(
      dbFor(PARENT).collection('messages').add({
        conversationId: REL_ID,
        senderId: CAREGIVER,
        text: 'Forged',
        messageType: 'text',
        status: 'sent',
        createdAt: serverTimestamp(),
      })
    );
  });

  it('denies posting into an unrelated conversation', async () => {
    await assertFails(
      dbFor(STRANGER).collection('messages').add({
        conversationId: REL_ID,
        senderId: STRANGER,
        text: 'Intruding',
        messageType: 'text',
        status: 'sent',
        createdAt: serverTimestamp(),
      })
    );
  });

  it('denies an unsupported message type', async () => {
    await assertFails(
      dbFor(PARENT).collection('messages').add({
        conversationId: REL_ID,
        senderId: PARENT,
        text: 'Bad type',
        messageType: 'video',
        status: 'sent',
        createdAt: serverTimestamp(),
      })
    );
  });

  it('denies reading messages of an unrelated conversation', async () => {
    await seedMessage({ text: 'Private' });
    await assertFails(
      dbFor(STRANGER)
        .collection('messages')
        .where('conversationId', '==', REL_ID)
        .get()
    );
    await assertFails(dbFor(OTHER_PARENT).collection('messages').get());
  });

  it('allows participants to read their own conversation history', async () => {
    await seedMessage();
    await assertSucceeds(
      dbFor(CAREGIVER)
        .collection('messages')
        .where('conversationId', '==', REL_ID)
        .get()
    );
  });

  it('denies editing or deleting a message', async () => {
    const messageId = await seedMessage();
    await assertFails(dbFor(PARENT).doc(`messages/${messageId}`).update({ text: 'Edited' }));
    await assertFails(dbFor(PARENT).doc(`messages/${messageId}`).delete());
  });
});

// ---------------------------------------------------------------------------
// Scheduled notifications
// ---------------------------------------------------------------------------
describe('scheduledNotifications collection', () => {
  it('is inaccessible to every client', async () => {
    await assertFails(
      dbFor(CAREGIVER).doc('scheduledNotifications/n1').set({ occurrenceId: 'x' })
    );
    await assertFails(dbFor(CAREGIVER).doc('scheduledNotifications/n1').get());
    await assertFails(
      dbFor(CAREGIVER).collection('scheduledNotifications').get()
    );
  });
});

// ---------------------------------------------------------------------------
// End to end
// ---------------------------------------------------------------------------
describe('end to end caregiver -> parent workflow', () => {
  it('lets a caregiver invite, a parent redeem, a reminder be created and acknowledged', async () => {
    const code = '246810';
    // The shared fixture pre-seeds a relationship; this test walks the whole
    // flow from scratch, so start from no relationship at all.
    await admin((db) => db.doc(`relationships/${REL_ID}`).delete());
    await assertSucceeds(
      dbFor(CAREGIVER).doc(`invitations/${code}`).set({
        childUid: CAREGIVER,
        code,
        createdAt: ts(),
        expiresAt: ts(60 * 60 * 1000),
        status: 'pending',
      })
    );

    // A stranger cannot read the unconsumed invitation.
    await assertFails(dbFor(STRANGER).doc(`invitations/${code}`).get());

    // Parent claims it.
    await assertSucceeds(
      dbFor(PARENT).doc(`invitations/${code}`).set(
        { status: 'consumed', parentUid: PARENT, consumedAt: ts() },
        { merge: true }
      )
    );

    // Parent can now read it, and nobody else can steal the relationship.
    await assertSucceeds(dbFor(PARENT).doc(`invitations/${code}`).get());
    const relId = `${CAREGIVER}_${PARENT}`;
    await assertFails(
      dbFor(STRANGER).doc(`relationships/${relId}`).set({
        id: relId,
        childId: CAREGIVER,
        parentId: STRANGER,
        invitationCode: code,
        status: 'active',
        createdAt: ts(),
        updatedAt: ts(),
      })
    );

    await assertSucceeds(
      dbFor(PARENT).doc(`relationships/${relId}`).set({
        id: relId,
        childId: CAREGIVER,
        parentId: PARENT,
        invitationCode: code,
        status: 'active',
        createdAt: ts(),
        updatedAt: ts(),
      })
    );

    // Caregiver creates a reminder that the parent can see.
    await assertSucceeds(
      dbFor(CAREGIVER).doc('careTasks/e2e-task').set({
        id: 'e2e-task',
        relationshipId: relId,
        createdBy: CAREGIVER,
        assignedTo: PARENT,
        type: 'medicine',
        title: 'Morning meds',
        scheduledTime: '09:00',
        frequency: 'daily',
        startDate: '2026-01-01',
        active: true,
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
    await assertSucceeds(dbFor(PARENT).doc('careTasks/e2e-task').get());

    // Occurrence is generated and acknowledged.
    await assertSucceeds(
      dbFor(CAREGIVER).doc('taskOccurrences/e2e-task_2026-01-01').set({
        id: 'e2e-task_2026-01-01',
        taskId: 'e2e-task',
        relationshipId: relId,
        parentId: PARENT,
        childId: CAREGIVER,
        title: 'Morning meds',
        type: 'medicine',
        scheduledDate: '2026-01-01',
        scheduledTime: '09:00',
        status: 'pending',
        createdAt: ts(),
        updatedAt: ts(),
      })
    );
    await assertSucceeds(
      dbFor(PARENT).doc('taskOccurrences/e2e-task_2026-01-01').set(
        { status: 'completed', completedAt: serverTimestamp(), completedBy: PARENT, updatedAt: ts() },
        { merge: true }
      )
    );

    // The caregiver observes the acknowledgment through their own read.
    const snap = await dbFor(CAREGIVER).doc('taskOccurrences/e2e-task_2026-01-01').get();
    expect(snap.data().status).toBe('completed');
    expect(snap.data().completedBy).toBe(PARENT);

    // And an unrelated parent still sees nothing.
    await assertFails(dbFor(OTHER_PARENT).doc('taskOccurrences/e2e-task_2026-01-01').get());
  });
});
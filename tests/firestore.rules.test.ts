import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore'

/**
 * These tests require the Firestore emulator. `npm test` skips this suite when
 * FIRESTORE_EMULATOR_HOST is not set; `npm run test:rules` starts the emulator
 * through firebase-tools and runs it.
 */
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? ''
const [host, port] = emulatorHost.split(':')
const suite = emulatorHost ? describe : describe.skip

let testEnv: RulesTestEnvironment

const rules = readFileSync('firestore.rules', 'utf8')

function missionAnswerDoc(missionId: string, userId: string) {
  return {
    missionId,
    userId,
    values: { conditions: ['none'], injuries: 'left knee' },
    updatedAt: Timestamp.now(),
    schemaVersion: 1,
  }
}

function recommendationDoc(recommendationId: string, userId: string) {
  return {
    recommendationId,
    userId,
    modelVersion: '1.0.0',
    modelSource: 'onnx-web',
    predictedPlanCategory: 'Bodyweight Circuit',
    planTemplateId: 'bodyweight-circuit',
    planTitle: 'Bodyweight Circuit — 7-Day Plan',
    fitnessGoal: 'health',
    datasetGoal: 'General Health',
    missionSnapshot: {
      answers: {},
      profile: { age: 31, heightCm: 178, weightKg: 78, workoutDays: [1, 3, 5] },
      capturedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    schedule: Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      kind: weekday === 0 ? 'rest' : 'strength',
      exercises: [],
    })),
    safety: {
      restricted: false,
      excludedPatterns: [],
      excludedInjuries: [],
      notes: [],
      professionalReviewRecommended: false,
      volumeCapApplied: false,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: Timestamp.now(),
    isActive: true,
    isOutdated: false,
    version: 1,
    generationStatus: 'ready',
    inferenceMs: 1,
    confidence: 0.9,
    classProbabilities: [{ label: 'Bodyweight Circuit', probability: 0.9 }],
  }
}

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const writes = [
      setDoc(doc(db, 'users', 'alice'), {
        uid: 'alice',
        fullName: 'Alice Active',
        accountStatus: 'active',
      }),
      setDoc(doc(db, 'users', 'bob'), {
        uid: 'bob',
        fullName: 'Bob Active',
        accountStatus: 'active',
      }),
      setDoc(doc(db, 'users', 'charlie'), {
        uid: 'charlie',
        fullName: 'Charlie Legacy',
      }),
      setDoc(doc(db, 'users', 'suspended'), {
        uid: 'suspended',
        fullName: 'Sam Suspended',
        accountStatus: 'suspended',
      }),
      setDoc(doc(db, 'adminUsers', 'super'), {
        uid: 'super',
        role: 'super_admin',
        active: true,
      }),
      setDoc(doc(db, 'adminUsers', 'admin'), {
        uid: 'admin',
        role: 'admin',
        active: true,
      }),
      setDoc(doc(db, 'adminUsers', 'fitness'), {
        uid: 'fitness',
        role: 'fitness_manager',
        active: true,
      }),
      setDoc(doc(db, 'adminUsers', 'support'), {
        uid: 'support',
        role: 'support_manager',
        active: true,
      }),
      setDoc(doc(db, 'adminUsers', 'analyst'), {
        uid: 'analyst',
        role: 'analyst',
        active: true,
      }),
      setDoc(doc(db, 'adminUsers', 'inactive'), {
        uid: 'inactive',
        role: 'super_admin',
        active: false,
      }),
      setDoc(doc(db, 'users', 'alice', 'missions', 'm1'), {
        missionId: 'm1',
        status: 'completed',
        userId: 'alice',
      }),
      setDoc(doc(db, 'users', 'alice', 'workouts', 'w1'), {
        workoutId: 'w1',
        userId: 'alice',
        title: 'Lower body',
      }),
      setDoc(doc(db, 'users', 'alice', 'mission_answers', 'health-profile'), missionAnswerDoc('health-profile', 'alice')),
      setDoc(doc(db, 'users', 'alice', 'workout_recommendations', 'rec1'), recommendationDoc('rec1', 'alice')),
      setDoc(doc(db, 'users', 'suspended', 'missions', 'm1'), {
        missionId: 'm1',
        status: 'completed',
        userId: 'suspended',
      }),
      setDoc(doc(db, 'users', 'suspended', 'mission_answers', 'health-profile'), missionAnswerDoc('health-profile', 'suspended')),
      setDoc(doc(db, 'users', 'suspended', 'workout_recommendations', 'rec1'), recommendationDoc('rec1', 'suspended')),
      setDoc(doc(db, 'supportTickets', 'aliceTicket'), {
        ticketId: 'FRG-ALICE',
        userId: 'alice',
        status: 'open',
        priority: 'medium',
        category: 'account',
        subject: 'Help with login',
        description: 'I cannot sign in to my account.',
      }),
      setDoc(doc(db, 'supportTickets', 'bobTicket'), {
        ticketId: 'FRG-BOB',
        userId: 'bob',
        status: 'open',
        priority: 'medium',
        category: 'account',
        subject: 'Bob private ticket',
        description: 'This ticket belongs to Bob only.',
      }),
      setDoc(doc(db, 'supportTickets', 'suspendedTicket'), {
        ticketId: 'FRG-SUSP',
        userId: 'suspended',
        status: 'open',
        priority: 'medium',
        category: 'account',
        subject: 'Suspended account appeal',
        description: 'Please review my suspended account.',
      }),
      setDoc(doc(db, 'supportTickets', 'aliceTicket', 'internal_notes', 'note1'), {
        ticketId: 'aliceTicket',
        adminId: 'support',
        note: 'Internal support note',
      }),
      setDoc(doc(db, 'notifications', 'n1'), {
        userId: 'suspended',
        title: 'Account notice',
        message: 'Your account is suspended.',
        type: 'system',
        read: false,
      }),
      setDoc(doc(db, 'workoutPlans', 'plan1'), {
        title: 'Plan one',
        status: 'published',
      }),
      setDoc(doc(db, 'platformSettings', 'main'), {
        supportEmail: 'support@example.test',
      }),
      setDoc(doc(db, 'private', 'secret'), {
        value: 'denied',
      }),
    ]
    await Promise.all(writes)
  })
}

suite('Firestore security rules', () => {
  beforeAll(async () => {
    if (!emulatorHost) return
    testEnv = await initializeTestEnvironment({
      projectId: 'forge-phase1-rules',
      firestore: {
        rules,
        host,
        port: Number(port),
      },
    })
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()
    await seed()
  })

  afterAll(async () => {
    await testEnv?.cleanup()
  })

  describe('authentication and member ownership', () => {
    it('denies unauthenticated reads of private user data', async () => {
      const db = testEnv.unauthenticatedContext().firestore()
      await assertFails(getDoc(doc(db, 'users', 'alice')))
    })

    it('allows a member to read their own user document', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(getDoc(userDocFor(db, 'alice')))
    })

    it('denies a member reading another member document', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertFails(getDoc(userDocFor(db, 'bob')))
    })

    it('denies a member writing another member subcollection', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertFails(
        setDoc(doc(db, 'users', 'bob', 'mission_answers', 'health-profile'), {
          missionId: 'health-profile',
          userId: 'bob',
          values: { conditions: ['none'] },
        }),
      )
    })

    it('denies a member changing accountStatus or adminNote', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertFails(updateDoc(userDocFor(db, 'alice'), { accountStatus: 'suspended' }))
      await assertFails(updateDoc(userDocFor(db, 'alice'), { adminNote: 'forged' }))
    })

    it('denies a member adding administrative role fields', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertFails(updateDoc(userDocFor(db, 'alice'), { role: 'super_admin' }))
      await assertFails(updateDoc(userDocFor(db, 'alice'), { permissions: ['manage_roles'] }))
    })

    it('allows an active member to update an ordinary profile field', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(updateDoc(userDocFor(db, 'alice'), { fullName: 'Alice Updated' }))
    })

    it('denies creating a user document with administrator-controlled fields', async () => {
      const db = testEnv.authenticatedContext('newbie').firestore()
      await assertFails(
        setDoc(doc(db, 'users', 'newbie'), {
          uid: 'newbie',
          accountStatus: 'active',
        }),
      )
      await assertSucceeds(
        setDoc(doc(db, 'users', 'newbie'), {
          uid: 'newbie',
          fullName: 'New Member',
        }),
      )
    })

    it('allows a legacy active member without accountStatus to use subcollections', async () => {
      const db = testEnv.authenticatedContext('charlie').firestore()
      await assertSucceeds(
        setDoc(doc(db, 'users', 'charlie', 'missions', 'm1'), {
          missionId: 'm1',
          status: 'in_progress',
          userId: 'charlie',
        }),
      )
    })
  })

  describe('administrator access', () => {
    it('allows active admins to read member records', async () => {
      const db = testEnv.authenticatedContext('admin').firestore()
      await assertSucceeds(getDoc(doc(db, 'users', 'alice')))
      await assertSucceeds(getDoc(doc(db, 'users', 'alice', 'missions', 'm1')))
    })

    it('denies inactive admins protected operations', async () => {
      const db = testEnv.authenticatedContext('inactive').firestore()
      await assertFails(getDoc(doc(db, 'users', 'alice')))
      await assertFails(getDoc(doc(db, 'workoutPlans', 'plan1')))
    })

    it('denies members listing admin records or granting themselves a role', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertFails(getDocs(collection(db, 'adminUsers')))
      await assertFails(
        setDoc(doc(db, 'adminUsers', 'alice'), {
          uid: 'alice',
          role: 'super_admin',
          active: true,
        }),
      )
    })

    it('allows super admins to provision an admin record', async () => {
      const db = testEnv.authenticatedContext('super').firestore()
      await assertSucceeds(
        setDoc(doc(db, 'adminUsers', 'newadmin'), {
          uid: 'newadmin',
          role: 'analyst',
          active: true,
        }),
      )
    })

    it('allows user-management admins to change account status', async () => {
      const db = testEnv.authenticatedContext('admin').firestore()
      await assertSucceeds(updateDoc(userDocFor(db, 'alice'), { accountStatus: 'suspended' }))
    })

    it('denies support managers changing account status', async () => {
      const db = testEnv.authenticatedContext('support').firestore()
      await assertFails(updateDoc(userDocFor(db, 'alice'), { accountStatus: 'suspended' }))
    })

    it('limits content collections to content roles', async () => {
      const supportDb = testEnv.authenticatedContext('support').firestore()
      const fitnessDb = testEnv.authenticatedContext('fitness').firestore()
      const adminDb = testEnv.authenticatedContext('admin').firestore()

      await assertFails(getDoc(doc(supportDb, 'workoutPlans', 'plan1')))
      await assertSucceeds(getDoc(doc(fitnessDb, 'workoutPlans', 'plan1')))
      await assertSucceeds(getDoc(doc(adminDb, 'workoutPlans', 'plan1')))
      await assertFails(
        setDoc(doc(supportDb, 'workoutPlans', 'plan2'), { title: 'Denied' }),
      )
    })

    it('limits platform settings to the platform role', async () => {
      const adminDb = testEnv.authenticatedContext('admin').firestore()
      const superDb = testEnv.authenticatedContext('super').firestore()
      await assertFails(getDoc(doc(adminDb, 'platformSettings', 'main')))
      await assertSucceeds(getDoc(doc(superDb, 'platformSettings', 'main')))
    })
  })

  describe('account suspension', () => {
    it('allows suspended members to read their root account document', async () => {
      const db = testEnv.authenticatedContext('suspended').firestore()
      await assertSucceeds(getDoc(userDocFor(db, 'suspended')))
    })

    it('denies suspended members reading member subcollections', async () => {
      const db = testEnv.authenticatedContext('suspended').firestore()
      await assertFails(getDoc(doc(db, 'users', 'suspended', 'missions', 'm1')))
      await assertFails(
        getDoc(doc(db, 'users', 'suspended', 'mission_answers', 'health-profile')),
      )
      await assertFails(
        getDoc(doc(db, 'users', 'suspended', 'workout_recommendations', 'rec1')),
      )
    })

    it('denies suspended members writing protected member data', async () => {
      const db = testEnv.authenticatedContext('suspended').firestore()
      await assertFails(updateDoc(userDocFor(db, 'suspended'), { fullName: 'Blocked' }))
      await assertFails(
        setDoc(doc(db, 'users', 'suspended', 'workouts', 'w1'), {
          workoutId: 'w1',
          userId: 'suspended',
          title: 'Blocked workout',
        }),
      )
    })

    it('keeps the support and notification recovery path available', async () => {
      const db = testEnv.authenticatedContext('suspended').firestore()
      await assertSucceeds(
        setDoc(doc(db, 'supportTickets', 'appeal'), {
          ticketId: 'FRG-APPEAL',
          userId: 'suspended',
          status: 'open',
          priority: 'medium',
          category: 'account',
          subject: 'Suspended account appeal',
          description: 'Please review my suspended account.',
        }),
      )
      await assertSucceeds(getDoc(doc(db, 'notifications', 'n1')))
    })

    it('allows active members after the suspension is removed', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await updateDoc(doc(context.firestore(), 'users', 'suspended'), {
          accountStatus: 'active',
        })
      })
      const db = testEnv.authenticatedContext('suspended').firestore()
      await assertSucceeds(getDoc(doc(db, 'users', 'suspended', 'missions', 'm1')))
    })
  })

  describe('sensitive data and recommendation documents', () => {
    it('allows active owners to read and write their mission answers', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(
        getDoc(doc(db, 'users', 'alice', 'mission_answers', 'health-profile')),
      )
      await assertSucceeds(
        setDoc(doc(db, 'users', 'alice', 'mission_answers', 'nutrition-profile'), {
          missionId: 'nutrition-profile',
          userId: 'alice',
          values: { diet: 'omnivore' },
          updatedAt: serverTimestamp(),
          schemaVersion: 1,
        }),
      )
    })

    it('limits sensitive mission answers to user-management admins', async () => {
      const supportDb = testEnv.authenticatedContext('support').firestore()
      const analystDb = testEnv.authenticatedContext('analyst').firestore()
      const adminDb = testEnv.authenticatedContext('admin').firestore()

      await assertFails(
        getDoc(doc(supportDb, 'users', 'alice', 'mission_answers', 'health-profile')),
      )
      await assertFails(
        getDoc(doc(analystDb, 'users', 'alice', 'mission_answers', 'health-profile')),
      )
      await assertSucceeds(
        getDoc(doc(adminDb, 'users', 'alice', 'mission_answers', 'health-profile')),
      )
    })

    it('limits recommendation snapshots to user-management admins', async () => {
      const supportDb = testEnv.authenticatedContext('support').firestore()
      const adminDb = testEnv.authenticatedContext('admin').firestore()

      await assertFails(
        getDoc(doc(supportDb, 'users', 'alice', 'workout_recommendations', 'rec1')),
      )
      await assertSucceeds(
        getDoc(doc(adminDb, 'users', 'alice', 'workout_recommendations', 'rec1')),
      )
    })

    it('allows a structurally valid owner recommendation write', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(
        setDoc(
          doc(db, 'users', 'alice', 'workout_recommendations', 'rec2'),
          { ...recommendationDoc('rec2', 'alice'), updatedAt: serverTimestamp() },
        ),
      )
    })

    it('denies a recommendation with an invalid schedule length', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertFails(
        setDoc(doc(db, 'users', 'alice', 'workout_recommendations', 'rec3'), {
          ...recommendationDoc('rec3', 'alice'),
          schedule: [],
          updatedAt: serverTimestamp(),
        }),
      )
    })

    it('denies a recommendation with unexpected top-level fields', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertFails(
        setDoc(doc(db, 'users', 'alice', 'workout_recommendations', 'rec4'), {
          ...recommendationDoc('rec4', 'alice'),
          isAdmin: true,
          updatedAt: serverTimestamp(),
        }),
      )
    })

    it('denies mission answers with unexpected fields', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertFails(
        setDoc(doc(db, 'users', 'alice', 'mission_answers', 'health-profile'), {
          ...missionAnswerDoc('health-profile', 'alice'),
          adminNote: 'forged',
          updatedAt: serverTimestamp(),
        }),
      )
    })

    it('denies writing another member recommendation document', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertFails(
        setDoc(
          doc(db, 'users', 'bob', 'workout_recommendations', 'rec2'),
          { ...recommendationDoc('rec2', 'bob'), updatedAt: serverTimestamp() },
        ),
      )
    })

    it('allows user-management admins to read collection-group sensitive data', async () => {
      const adminDb = testEnv.authenticatedContext('admin').firestore()
      const supportDb = testEnv.authenticatedContext('support').firestore()
      await assertSucceeds(getDocs(collectionGroup(adminDb, 'mission_answers')))
      await assertFails(getDocs(collectionGroup(supportDb, 'mission_answers')))
    })
  })

  describe('support isolation', () => {
    it('denies members reading another member ticket', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertFails(getDoc(doc(db, 'supportTickets', 'bobTicket')))
    })

    it('denies members reading internal notes', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertFails(
        getDoc(doc(db, 'supportTickets', 'aliceTicket', 'internal_notes', 'note1')),
      )
    })

    it('allows support staff to read tickets and internal notes', async () => {
      const db = testEnv.authenticatedContext('support').firestore()
      await assertSucceeds(getDocs(collection(db, 'supportTickets')))
      await assertSucceeds(
        getDoc(doc(db, 'supportTickets', 'aliceTicket', 'internal_notes', 'note1')),
      )
    })

    it('denies inactive admins support access', async () => {
      const db = testEnv.authenticatedContext('inactive').firestore()
      await assertFails(getDocs(collection(db, 'supportTickets')))
    })
  })

  describe('global deny', () => {
    it('denies unknown and unauthorized collection paths', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertFails(getDoc(doc(db, 'private', 'secret')))
      await assertFails(setDoc(doc(db, 'private', 'secret'), { value: 'written' }))
    })

    it('keeps support managers out of unrelated admin collections', async () => {
      const db = testEnv.authenticatedContext('support').firestore()
      await assertFails(getDoc(doc(db, 'workoutPlans', 'plan1')))
      await assertFails(getDoc(doc(db, 'platformSettings', 'main')))
    })
  })
})

function userDocFor(db: Firestore, uid: string) {
  return doc(db, 'users', uid)
}

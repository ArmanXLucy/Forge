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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
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
      setDoc(doc(db, 'workoutPlans', 'draftPlan'), {
        title: 'Draft plan',
        status: 'draft',
      }),
      setDoc(doc(db, 'nutritionPlans', 'nutrition1'), {
        name: 'Performance base',
        status: 'published',
      }),
      setDoc(doc(db, 'nutritionPlans', 'draftNutrition'), {
        name: 'Draft nutrition',
        status: 'draft',
      }),
      setDoc(doc(db, 'exerciseLibrary', 'squat'), {
        name: 'Back squat',
        instructions: 'Brace, sit down, stand up.',
      }),
      setDoc(doc(db, 'announcements', 'publishedNotice'), {
        title: 'Platform update',
        body: 'The member workspace has a new published announcement path.',
        status: 'published',
        tone: 'update',
        createdBy: 'super',
        createdByName: 'Super Admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        publishedAt: Timestamp.now(),
        schemaVersion: 1,
      }),
      setDoc(doc(db, 'announcements', 'draftNotice'), {
        title: 'Draft notice',
        body: 'This announcement is still a draft and must not reach members.',
        status: 'draft',
        tone: 'info',
        createdBy: 'super',
        createdByName: 'Super Admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        publishedAt: null,
        schemaVersion: 1,
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

    it('allows only the default active status on user creation', async () => {
      const db = testEnv.authenticatedContext('newbie').firestore()
      await assertFails(
        setDoc(doc(db, 'users', 'newbie'), {
          uid: 'newbie',
          accountStatus: 'suspended',
        }),
      )
      await assertSucceeds(
        setDoc(doc(db, 'users', 'newbie'), {
          uid: 'newbie',
          accountStatus: 'active',
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

    it('allows a legacy member to backfill only the default active status', async () => {
      const db = testEnv.authenticatedContext('charlie').firestore()
      await assertSucceeds(updateDoc(userDocFor(db, 'charlie'), { accountStatus: 'active' }))
      await assertFails(updateDoc(userDocFor(db, 'charlie'), { accountStatus: 'suspended' }))
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
      await assertFails(getDoc(doc(db, 'workoutPlans', 'draftPlan')))
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
          permissions: [],
        }),
      )
    })

    it('allows user-management admins to change account status with a reason', async () => {
      const db = testEnv.authenticatedContext('admin').firestore()
      await assertSucceeds(
        updateDoc(userDocFor(db, 'alice'), {
          accountStatus: 'suspended',
          suspensionReason: 'Chargeback investigation pending review',
          suspendedBy: 'admin',
          suspendedByName: 'Admin User',
        }),
      )
    })

    it('denies admins writing arbitrary fields through account management', async () => {
      const db = testEnv.authenticatedContext('admin').firestore()
      await assertFails(updateDoc(userDocFor(db, 'alice'), { role: 'super_admin' }))
      await assertFails(updateDoc(userDocFor(db, 'alice'), { email: 'forged@example.test' }))
    })

    it('validates administrator role documents', async () => {
      const db = testEnv.authenticatedContext('super').firestore()
      await assertFails(
        setDoc(doc(db, 'adminUsers', 'badadmin'), {
          uid: 'badadmin',
          role: 'owner',
          active: true,
          permissions: [],
        }),
      )
      await assertFails(
        setDoc(doc(db, 'adminUsers', 'badadmin'), {
          uid: 'badadmin',
          role: 'admin',
          active: 'yes',
          permissions: [],
        }),
      )
    })

    it('denies support managers changing account status', async () => {
      const db = testEnv.authenticatedContext('support').firestore()
      await assertFails(updateDoc(userDocFor(db, 'alice'), { accountStatus: 'suspended' }))
    })

    it('limits content collections to content roles', async () => {
      const supportDb = testEnv.authenticatedContext('support').firestore()
      const fitnessDb = testEnv.authenticatedContext('fitness').firestore()
      const adminDb = testEnv.authenticatedContext('admin').firestore()

      await assertSucceeds(getDoc(doc(supportDb, 'workoutPlans', 'plan1')))
      await assertFails(getDoc(doc(supportDb, 'workoutPlans', 'draftPlan')))
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

    it('allows members to read published content but not drafts', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(getDoc(doc(db, 'workoutPlans', 'plan1')))
      await assertFails(getDoc(doc(db, 'workoutPlans', 'draftPlan')))
      await assertSucceeds(getDoc(doc(db, 'nutritionPlans', 'nutrition1')))
      await assertFails(getDoc(doc(db, 'nutritionPlans', 'draftNutrition')))
      await assertSucceeds(getDoc(doc(db, 'exerciseLibrary', 'squat')))
    })

    it('allows member list queries only for published content', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(
        getDocs(query(collection(db, 'workoutPlans'), where('status', '==', 'published'))),
      )
      await assertFails(getDocs(collection(db, 'workoutPlans')))
      await assertSucceeds(
        getDocs(query(collection(db, 'announcements'), where('status', '==', 'published'))),
      )
      await assertFails(getDocs(collection(db, 'announcements')))
    })

    it('denies unauthenticated reads of coaching content', async () => {
      const db = testEnv.unauthenticatedContext().firestore()
      await assertFails(getDoc(doc(db, 'workoutPlans', 'plan1')))
      await assertFails(getDoc(doc(db, 'exerciseLibrary', 'squat')))
    })

    it('allows platform admins to manage announcements', async () => {
      const db = testEnv.authenticatedContext('super').firestore()
      await assertSucceeds(
        setDoc(doc(db, 'announcements', 'newNotice'), {
          title: 'New member notice',
          body: 'A valid announcement body for members.',
          status: 'draft',
          tone: 'info',
          createdBy: 'super',
          createdByName: 'Super Admin',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          publishedAt: null,
          schemaVersion: 1,
        }),
      )
      await assertSucceeds(
        updateDoc(doc(db, 'announcements', 'newNotice'), {
          status: 'published',
          publishedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      )
      await assertSucceeds(deleteDoc(doc(db, 'announcements', 'newNotice')))
    })

    it('denies invalid or unauthorized announcement writes', async () => {
      const superDb = testEnv.authenticatedContext('super').firestore()
      const memberDb = testEnv.authenticatedContext('alice').firestore()
      await assertFails(
        setDoc(doc(superDb, 'announcements', 'invalid'), {
          title: 'x',
          body: 'short',
          status: 'published',
          tone: 'info',
          createdBy: 'super',
          updatedAt: serverTimestamp(),
          publishedAt: null,
          schemaVersion: 1,
        }),
      )
      await assertFails(
        setDoc(doc(memberDb, 'announcements', 'memberNotice'), {
          title: 'Member notice',
          body: 'Members must not create announcements.',
          status: 'published',
          tone: 'info',
          createdBy: 'alice',
          updatedAt: serverTimestamp(),
          publishedAt: serverTimestamp(),
          schemaVersion: 1,
        }),
      )
    })

    it('allows members to read only published announcements', async () => {
      const db = testEnv.authenticatedContext('alice').firestore()
      await assertSucceeds(getDoc(doc(db, 'announcements', 'publishedNotice')))
      await assertFails(getDoc(doc(db, 'announcements', 'draftNotice')))
    })

    it('keeps audit records immutable to administrators', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'adminActivityLogs', 'log1'), {
          adminId: 'admin',
          adminName: 'Admin User',
          action: 'user.suspend',
          targetType: 'user',
          targetId: 'alice',
          detail: 'Suspended',
          createdAt: Timestamp.now(),
          schemaVersion: 1,
        })
      })
      const db = testEnv.authenticatedContext('admin').firestore()
      await assertSucceeds(getDoc(doc(db, 'adminActivityLogs', 'log1')))
      await assertFails(updateDoc(doc(db, 'adminActivityLogs', 'log1'), { detail: 'Rewritten' }))
      await assertFails(deleteDoc(doc(db, 'adminActivityLogs', 'log1')))
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
      await assertFails(getDoc(doc(db, 'workoutPlans', 'draftPlan')))
      await assertFails(getDoc(doc(db, 'platformSettings', 'main')))
    })
  })
})

function userDocFor(db: Firestore, uid: string) {
  return doc(db, 'users', uid)
}

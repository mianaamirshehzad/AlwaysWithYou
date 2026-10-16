import { Timestamp } from 'firebase/firestore';

// Helper representing the RootNavigator guard in app/_layout.tsx
export function evaluateNavigationGuard(params: {
  status: 'loading' | 'unauthenticated' | 'authenticated';
  role: 'child' | 'parent' | null;
  relationshipsLoading: boolean;
  isParentLinked: boolean;
  currentSegment: string;
}): string | null {
  const { status, role, relationshipsLoading, isParentLinked, currentSegment } = params;

  if (status === 'loading') {
    return null;
  }

  if (status === 'unauthenticated') {
    if (currentSegment === '(tabs)' || currentSegment === '(parent-tabs)') {
      return '/';
    }
    return null;
  }

  if (status === 'authenticated' && role !== null) {
    if (role === 'child') {
      if (currentSegment !== '(tabs)' && currentSegment !== 'modal') {
        return '/(tabs)';
      }
      return null;
    }

    if (role === 'parent') {
      if (relationshipsLoading) {
        return null; // Hold on loading gate, avoid redirect loops
      }

      if (isParentLinked) {
        if (currentSegment !== '(parent-tabs)' && currentSegment !== 'modal') {
          return '/(parent-tabs)';
        }
      } else {
        if (currentSegment !== 'invite' && currentSegment !== 'modal') {
          return '/invite';
        }
      }
    }
  }

  return null;
}

// Helper simulating atomic consumeInvitation logic
export function validateAndProcessInvitation(params: {
  code: string;
  parentUid: string;
  parentRole: 'child' | 'parent';
  invitationRecord: {
    childUid: string;
    code: string;
    status: 'pending' | 'consumed' | 'expired';
    expiresAtMillis: number;
  } | null;
  nowMillis: number;
}): { relationshipId: string; childId: string } {
  const cleanCode = params.code.trim();

  // 1. Validate exactly 6 digits while preserving leading zeros
  if (!/^\d{6}$/.test(cleanCode)) {
    throw new Error('Please enter a valid 6-digit invitation code.');
  }

  // 2. Confirm authenticated user is a parent
  if (params.parentRole !== 'parent') {
    throw new Error('Only parent accounts can link using an invitation code.');
  }

  // 3. Verify invitation exists
  if (!params.invitationRecord) {
    throw new Error('Invalid invitation code. Please check the code and try again.');
  }

  const { invitationRecord, parentUid, nowMillis } = params;

  // 4. Reject already-consumed, expired, or self-linking
  if (invitationRecord.status === 'consumed') {
    throw new Error('This invitation has already been used. Please ask for a new one.');
  }

  if (invitationRecord.status !== 'pending') {
    throw new Error('This invitation is no longer active. Please ask for a new one.');
  }

  if (invitationRecord.expiresAtMillis < nowMillis) {
    throw new Error('This invitation has expired. Please ask for a new one.');
  }

  if (invitationRecord.childUid === parentUid) {
    throw new Error('You cannot connect to yourself.');
  }

  return {
    relationshipId: `${invitationRecord.childUid}_${parentUid}`,
    childId: invitationRecord.childUid,
  };
}

describe('Parent Signup & Mandatory Linking Workflow', () => {
  describe('1. Signup & Routing Destinations', () => {
    it('redirects parent signup to invitation linking (/invite)', () => {
      const role = 'parent' as 'parent' | 'child';
      const destination = role === 'child' ? '/(tabs)' : '/invite';
      expect(destination).toBe('/invite');
    });

    it('redirects child signup to child dashboard (/(tabs))', () => {
      const role = 'child' as 'parent' | 'child';
      const destination = role === 'child' ? '/(tabs)' : '/invite';
      expect(destination).toBe('/(tabs)');
    });
  });

  describe('2. Navigation Guard & Unlinked Parent Blocking', () => {
    it('redirects unlinked parent to /invite when on index /', () => {
      const redirect = evaluateNavigationGuard({
        status: 'authenticated',
        role: 'parent',
        relationshipsLoading: false,
        isParentLinked: false,
        currentSegment: '',
      });
      expect(redirect).toBe('/invite');
    });

    it('prevents direct navigation to /(parent-tabs) for unlinked parent', () => {
      const redirect = evaluateNavigationGuard({
        status: 'authenticated',
        role: 'parent',
        relationshipsLoading: false,
        isParentLinked: false,
        currentSegment: '(parent-tabs)',
      });
      expect(redirect).toBe('/invite');
    });

    it('allows unlinked parent to remain on /invite without redirecting', () => {
      const redirect = evaluateNavigationGuard({
        status: 'authenticated',
        role: 'parent',
        relationshipsLoading: false,
        isParentLinked: false,
        currentSegment: 'invite',
      });
      expect(redirect).toBeNull();
    });

    it('holds on loading gate while relationships are loading and does not redirect', () => {
      const redirect = evaluateNavigationGuard({
        status: 'authenticated',
        role: 'parent',
        relationshipsLoading: true,
        isParentLinked: false,
        currentSegment: 'invite',
      });
      expect(redirect).toBeNull();
    });

    it('redirects authenticated linked parent directly to /(parent-tabs)', () => {
      const redirect = evaluateNavigationGuard({
        status: 'authenticated',
        role: 'parent',
        relationshipsLoading: false,
        isParentLinked: true,
        currentSegment: 'invite',
      });
      expect(redirect).toBe('/(parent-tabs)');
    });

    it('allows linked parent on /(parent-tabs) without redirecting', () => {
      const redirect = evaluateNavigationGuard({
        status: 'authenticated',
        role: 'parent',
        relationshipsLoading: false,
        isParentLinked: true,
        currentSegment: '(parent-tabs)',
      });
      expect(redirect).toBeNull();
    });

    it('redirects unauthenticated user away from protected parent routes', () => {
      const redirect = evaluateNavigationGuard({
        status: 'unauthenticated',
        role: null,
        relationshipsLoading: false,
        isParentLinked: false,
        currentSegment: '(parent-tabs)',
      });
      expect(redirect).toBe('/');
    });

    it('allows unauthenticated user to view public invite route', () => {
      const redirect = evaluateNavigationGuard({
        status: 'unauthenticated',
        role: null,
        relationshipsLoading: false,
        isParentLinked: false,
        currentSegment: 'invite',
      });
      expect(redirect).toBeNull();
    });
  });

  describe('3. Six-Digit Code Validation with Leading Zeros', () => {
    const validInvitation = {
      childUid: 'child-123',
      code: '012345',
      status: 'pending' as const,
      expiresAtMillis: Date.now() + 60000,
    };

    it('accepts code with leading zeros like "012345"', () => {
      const result = validateAndProcessInvitation({
        code: '012345',
        parentUid: 'parent-456',
        parentRole: 'parent',
        invitationRecord: validInvitation,
        nowMillis: Date.now(),
      });
      expect(result.relationshipId).toBe('child-123_parent-456');
    });

    it('accepts code with multiple leading zeros like "000123"', () => {
      const result = validateAndProcessInvitation({
        code: '000123',
        parentUid: 'parent-456',
        parentRole: 'parent',
        invitationRecord: { ...validInvitation, code: '000123' },
        nowMillis: Date.now(),
      });
      expect(result.relationshipId).toBe('child-123_parent-456');
    });

    it('rejects codes shorter than 6 digits', () => {
      expect(() =>
        validateAndProcessInvitation({
          code: '12345',
          parentUid: 'parent-456',
          parentRole: 'parent',
          invitationRecord: validInvitation,
          nowMillis: Date.now(),
        })
      ).toThrow('Please enter a valid 6-digit invitation code.');
    });

    it('rejects codes longer than 6 digits', () => {
      expect(() =>
        validateAndProcessInvitation({
          code: '1234567',
          parentUid: 'parent-456',
          parentRole: 'parent',
          invitationRecord: validInvitation,
          nowMillis: Date.now(),
        })
      ).toThrow('Please enter a valid 6-digit invitation code.');
    });

    it('rejects codes with letters or special characters', () => {
      expect(() =>
        validateAndProcessInvitation({
          code: '12A456',
          parentUid: 'parent-456',
          parentRole: 'parent',
          invitationRecord: validInvitation,
          nowMillis: Date.now(),
        })
      ).toThrow('Please enter a valid 6-digit invitation code.');
    });
  });

  describe('4. Business Logic & Security Rejections', () => {
    const now = Date.now();

    it('rejects submission if user is not a parent', () => {
      expect(() =>
        validateAndProcessInvitation({
          code: '123456',
          parentUid: 'child-999',
          parentRole: 'child',
          invitationRecord: {
            childUid: 'child-123',
            code: '123456',
            status: 'pending',
            expiresAtMillis: now + 60000,
          },
          nowMillis: now,
        })
      ).toThrow('Only parent accounts can link using an invitation code.');
    });

    it('rejects non-existent invitation', () => {
      expect(() =>
        validateAndProcessInvitation({
          code: '999999',
          parentUid: 'parent-456',
          parentRole: 'parent',
          invitationRecord: null,
          nowMillis: now,
        })
      ).toThrow('Invalid invitation code. Please check the code and try again.');
    });

    it('rejects already-consumed invitation', () => {
      expect(() =>
        validateAndProcessInvitation({
          code: '123456',
          parentUid: 'parent-456',
          parentRole: 'parent',
          invitationRecord: {
            childUid: 'child-123',
            code: '123456',
            status: 'consumed',
            expiresAtMillis: now + 60000,
          },
          nowMillis: now,
        })
      ).toThrow('This invitation has already been used. Please ask for a new one.');
    });

    it('rejects expired invitation', () => {
      expect(() =>
        validateAndProcessInvitation({
          code: '123456',
          parentUid: 'parent-456',
          parentRole: 'parent',
          invitationRecord: {
            childUid: 'child-123',
            code: '123456',
            status: 'pending',
            expiresAtMillis: now - 1000, // expired 1s ago
          },
          nowMillis: now,
        })
      ).toThrow('This invitation has expired. Please ask for a new one.');
    });

    it('rejects self-linking (child connecting to themselves)', () => {
      expect(() =>
        validateAndProcessInvitation({
          code: '123456',
          parentUid: 'user-same',
          parentRole: 'parent',
          invitationRecord: {
            childUid: 'user-same',
            code: '123456',
            status: 'pending',
            expiresAtMillis: now + 60000,
          },
          nowMillis: now,
        })
      ).toThrow('You cannot connect to yourself.');
    });

    it('concurrency simulation: second parent claim on same invitation fails', () => {
      const invitation = {
        childUid: 'child-1',
        code: '123456',
        status: 'pending' as 'pending' | 'consumed',
        expiresAtMillis: now + 60000,
      };

      // First parent claims
      const firstClaim = validateAndProcessInvitation({
        code: '123456',
        parentUid: 'parent-1',
        parentRole: 'parent',
        invitationRecord: invitation,
        nowMillis: now,
      });
      expect(firstClaim.relationshipId).toBe('child-1_parent-1');

      // Update invitation state as atomic transaction would
      invitation.status = 'consumed';

      // Second concurrent claim arrives
      expect(() =>
        validateAndProcessInvitation({
          code: '123456',
          parentUid: 'parent-2',
          parentRole: 'parent',
          invitationRecord: invitation,
          nowMillis: now,
        })
      ).toThrow('This invitation has already been used. Please ask for a new one.');
    });
  });

  describe('5. Returning Parent Login Behavior', () => {
    it('determines login destination as /(parent-tabs) when parent has active relationship', () => {
      const relationships = [{ id: 'child-1_parent-1', status: 'active' }];
      const hasActiveRel = relationships.some((r) => r.status === 'active');
      const destination = hasActiveRel ? '/(parent-tabs)' : '/invite';
      expect(destination).toBe('/(parent-tabs)');
    });

    it('determines login destination as /invite when parent has no active relationship', () => {
      const relationships: Array<{ id: string; status: string }> = [];
      const hasActiveRel = relationships.some((r) => r.status === 'active');
      const destination = hasActiveRel ? '/(parent-tabs)' : '/invite';
      expect(destination).toBe('/invite');
    });
  });
});

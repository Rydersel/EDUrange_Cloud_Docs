"use client";

import { CategoryBackground } from '../components/UIComponents';
import { TableNode } from '../components/TableNode';

// Node types definition for ReactFlow
export const nodeTypes = {
  table: TableNode,
  categoryBackground: CategoryBackground,
};

// Flow group definitions
export const FLOW_GROUPS = {
  ALL: 'all',
  AUTH: 'auth',
  CHALLENGE: 'challenge',
  COMPETITION: 'competition',
  SCORING: 'scoring',
  ACTIVITY: 'activity',
  GENERAL: 'general'
};

// Relationship types
export const RELATIONSHIP_TYPES = {
  PRIMARY_KEY: 'primary_key',
  FOREIGN_KEY: 'foreign_key',
  ONE_TO_MANY: 'one_to_many',
  MANY_TO_MANY: 'many_to_many',
  UNIQUE_CONSTRAINT: 'unique_constraint',
  ONE_TO_ONE: 'one_to_one'
};

// Schema categories
export const SCHEMA_CATEGORIES = {
  USER: 'user',
  COMPETITION: 'competition',
  CHALLENGE: 'challenge',
  ACTIVITY: 'activity',
  AUTH: 'auth',
  QUESTION: 'question',
  SYSTEM: 'system'
};

// Category information mapping
export const CATEGORY_INFO = {
  [SCHEMA_CATEGORIES.USER]: { label: 'User Management', color: '#3B82F6' },
  [SCHEMA_CATEGORIES.COMPETITION]: { label: 'Competition & Groups', color: '#10B981' },
  [SCHEMA_CATEGORIES.CHALLENGE]: { label: 'Challenges', color: '#8B5CF6' },
  [SCHEMA_CATEGORIES.ACTIVITY]: { label: 'Activity & Logging', color: '#F59E0B' },
  [SCHEMA_CATEGORIES.AUTH]: { label: 'Authentication', color: '#EF4444' },
  [SCHEMA_CATEGORIES.QUESTION]: { label: 'Questions & Quizzes', color: '#06B6D4' },
  [SCHEMA_CATEGORIES.SYSTEM]: { label: 'System & Config', color: '#6B7280' }
};

// Prisma primitive types
export const PRISMA_PRIMITIVE_TYPES = [
  'String',
  'Int', 
  'BigInt',
  'Float',
  'Decimal',
  'Boolean',
  'DateTime',
  'Json',
  'Bytes'
]; 
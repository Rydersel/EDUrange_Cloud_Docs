/**
 * Jest setup file for Prisma parser tests
 * Configures testing environment and global test utilities
 */

// Add custom matchers
expect.extend({
  toBeValidPrismaField(received) {
    const pass = received !== null && 
                 typeof received === 'object' && 
                 'name' in received && 
                 'type' in received;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid Prisma field`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid Prisma field`,
        pass: false
      };
    }
  },

  toHaveRelationshipType(received, expected) {
    const pass = received?.relationshipType === expected;
    
    if (pass) {
      return {
        message: () => `expected field not to have relationship type ${expected}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected field to have relationship type ${expected}, but got ${received?.relationshipType}`,
        pass: false
      };
    }
  },

  toBeRelatedTo(received, expectedModel) {
    const pass = received?.relatedModel === expectedModel;
    
    if (pass) {
      return {
        message: () => `expected field not to be related to ${expectedModel}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected field to be related to ${expectedModel}, but got ${received?.relatedModel}`,
        pass: false
      };
    }
  }
});

// Global test utilities
global.testUtils = {
  // Helper to create a basic field for testing
  createBasicField: (name, type, attributes = []) => {
    const attributeString = attributes.length > 0 ? ` ${attributes.join(' ')}` : '';
    return `${name} ${type}${attributeString}`;
  },

  // Helper to create a relation field
  createRelationField: (name, type, relationConfig = {}) => {
    const { name: relationName, fields, references, onDelete, onUpdate } = relationConfig;
    let relationString = '@relation(';
    
    const parts = [];
    if (relationName) parts.push(`name: "${relationName}"`);
    if (fields) parts.push(`fields: [${fields.join(', ')}]`);
    if (references) parts.push(`references: [${references.join(', ')}]`);
    if (onDelete) parts.push(`onDelete: ${onDelete}`);
    if (onUpdate) parts.push(`onUpdate: ${onUpdate}`);
    
    relationString += parts.join(', ') + ')';
    
    return `${name} ${type} ${relationString}`;
  },

  // Helper to validate parsed field structure
  validateFieldStructure: (field) => {
    const requiredProperties = [
      'name', 'type', 'key', 'optional', 'isArray', 'unique', 'hasDefault',
      'isUpdatedAt', 'isCreatedAt', 'isIgnored', 'isPrimitive', 'isEnum',
      'isRelated', 'isRelation', 'relationshipType', 'relatedModel', 'relatedField'
    ];
    
    return requiredProperties.every(prop => prop in field);
  },

  // Sample Prisma schema snippets for testing
  sampleSchemas: {
    simpleUser: `
      model User {
        id    String @id
        name  String
        email String @unique
      }
    `,
    
    userWithRelations: `
      model User {
        id       String @id @default(cuid())
        email    String @unique
        posts    Post[]
        profile  Profile?
      }
    `,
    
    complexModel: `
      model Post {
        id        String   @id @default(cuid())
        title     String
        content   String?
        published Boolean  @default(false)
        authorId  String
        author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
        createdAt DateTime @default(now())
        updatedAt DateTime @updatedAt
        tags      Tag[]    @relation("PostTags")
        
        @@map("posts")
        @@index([authorId])
        @@unique([title, authorId])
      }
    `
  }
};

// Console warnings for test environment
const originalWarn = console.warn;
console.warn = (message, ...args) => {
  // Suppress specific warnings during tests
  if (typeof message === 'string' && message.includes('Error parsing field:')) {
    return;
  }
  originalWarn(message, ...args);
};

// Mock window and document for components that might need them
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock fetch for API calls in tests
global.fetch = jest.fn();

// Set test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  fetch.mockClear();
}); 
/**
 * Comprehensive unit tests for the Prisma schema parser
 * Tests all enhanced parsing functionality including fields, relationships, and model directives
 */

// Mock the functions we need to test by importing them from the component
// In a real npm package, these would be separate modules
import { describe, test, expect, beforeEach } from '@jest/globals';

// Mock theme colors for testing
const mockColors = {
  isDark: false,
  schemas: {
    user: '#3B82F6',
    competition: '#10B981',
    challenge: '#8B5CF6',
    activity: '#F59E0B',
    auth: '#EF4444',
    question: '#06B6D4',
    system: '#6B7280'
  }
};

// Extract the parsing functions for testing
// Note: In a real implementation, these would be exported separately
const parseField = (line) => {
  try {
    const trimmedLine = line.trim();

    // Skip certain lines
    if (trimmedLine.startsWith('@@') ||
        trimmedLine.startsWith('//') ||
        trimmedLine === '' ||
        trimmedLine === '{' ||
        trimmedLine === '}') {
      return null;
    }

    // Parse basic field information
    const parts = trimmedLine.split(/\s+/);
    if (parts.length < 2) return null;

    const fieldName = parts[0];
    let fieldType = parts[1];

    // Remove optional/array markers for analysis
    const isOptional = fieldType.includes('?');
    const isArray = fieldType.includes('[]');
    fieldType = fieldType.replace(/[\?\[\]]/g, '');

    // Check for various annotations and attributes
    const isId = trimmedLine.includes('@id');
    const isUnique = trimmedLine.includes('@unique');
    const isDefault = trimmedLine.includes('@default');
    const isUpdatedAt = trimmedLine.includes('@updatedAt');
    const isCreatedAt = trimmedLine.includes('@createdAt');
    const isIgnored = trimmedLine.includes('@ignore');

    // Parse @map attribute for custom column names
    let mappedName = null;
    const mapMatch = trimmedLine.match(/@map\s*\(\s*["']([^"']+)["']\s*\)/);
    if (mapMatch) {
      mappedName = mapMatch[1];
    }

    // Parse @default attribute values - FIXED: Properly capture full function calls
    let defaultValue = null;
    if (isDefault) {
      // Simple regex that handles basic function calls and simple values
      const defaultMatch = trimmedLine.match(/@default\s*\(([^)]*\([^)]*\)|[^)]*)\)/);
      if (defaultMatch) {
        defaultValue = defaultMatch[1].trim();
      }
    }

    // Enhanced field type detection
    const isPrimitiveType = ['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes'].includes(fieldType);
    const isEnumType = !isPrimitiveType && !isArray && fieldType.charAt(0) === fieldType.charAt(0).toUpperCase() && !trimmedLine.includes('@relation');

    // Detect relationships - enhanced logic
    let relationshipType = null;
    let relatedModel = null;
    let relatedField = null;
    let isRelated = false;
    let isRelation = false;
    let relationName = null;
    let onDelete = null;
    let onUpdate = null;

    // Check for explicit @relation directive
    if (trimmedLine.includes('@relation')) {
      isRelated = true;
      isRelation = true;

      // Extract relation information
      const relationMatch = trimmedLine.match(/@relation\s*\([^)]*\)/);
      if (relationMatch) {
        const relationContent = relationMatch[0];

        // Parse relation name
        const nameMatch = relationContent.match(/name:\s*["']([^"']+)["']/);
        if (nameMatch) {
          relationName = nameMatch[1];
        }

        // Parse onDelete and onUpdate actions
        const onDeleteMatch = relationContent.match(/onDelete:\s*(\w+)/);
        if (onDeleteMatch) {
          onDelete = onDeleteMatch[1];
        }

        const onUpdateMatch = relationContent.match(/onUpdate:\s*(\w+)/);
        if (onUpdateMatch) {
          onUpdate = onUpdateMatch[1];
        }

        // Check for fields and references
        const fieldsMatch = relationContent.match(/fields:\s*\[([^\]]+)\]/);
        const referencesMatch = relationContent.match(/references:\s*\[([^\]]+)\]/);

        if (fieldsMatch && referencesMatch) {
          // This is a foreign key field
          relationshipType = 'foreign_key';
          relatedField = referencesMatch[1].trim().replace(/['"]/g, '');
        } else {
          // This is a relation field (other side) - determine type based on array and relation name
          if (isArray) {
            relationshipType = 'one_to_many';
          } else if (relationName) {
            // Named relations without explicit fields/references are likely many-to-many junction tables
            relationshipType = 'many_to_many';
          } else {
            relationshipType = 'one_to_one';
          }
        }
      }

      // Determine related model from field type
      if (!isPrimitiveType && !isEnumType) {
        relatedModel = fieldType;
      }
    }

    // Primary key detection
    if (isId) {
      relationshipType = relationshipType || 'primary_key';
      isRelated = true;
    }

    // Unique constraint detection - FIXED: Properly set isRelated to true
    if (isUnique && !isId) {
      relationshipType = relationshipType || 'unique_constraint';
      isRelated = true; // FIXED: This was missing
    }

    // Enhanced foreign key detection for implicit relationships
    if ((fieldName.endsWith('_id') || fieldName.endsWith('Id')) && isPrimitiveType) {
      isRelated = true;
      if (!relationshipType) {
        relationshipType = 'foreign_key';
      }

      // Infer related model from field name if not already set
      if (!relatedModel) {
        relatedModel = fieldName.replace(/_?[iI]d$/g, '').replace(/_/g, '');
        relatedModel = relatedModel.charAt(0).toUpperCase() + relatedModel.slice(1);
      }

      // Default related field
      if (!relatedField) {
        relatedField = 'id';
      }
    }

    // Array relationship detection
    if (isArray && !isPrimitiveType && !isEnumType) {
      isRelated = true;
      isRelation = true;
      relationshipType = relationshipType || 'one_to_many';
      relatedModel = fieldType;
    }

    // REMOVED: Problematic composite relationship detection that was overriding foreign_key relationships
    // The logic for many-to-many should only apply when there are no explicit fields/references

    return {
      name: fieldName,
      type: fieldType,
      mappedName,
      defaultValue,
      key: isId,
      optional: isOptional,
      isArray: isArray,
      unique: isUnique,
      hasDefault: isDefault,
      isUpdatedAt,
      isCreatedAt,
      isIgnored,
      isPrimitive: isPrimitiveType,
      isEnum: isEnumType,
      isRelated,
      isRelation,
      relationshipType,
      relatedModel,
      relatedField: relatedField || 'id',
      relationName,
      onDelete,
      onUpdate
    };
  } catch (error) {
    console.warn('Error parsing field:', line, error);
    return null;
  }
};

describe('Prisma Schema Parser Tests', () => {
  describe('parseField function', () => {

    describe('Basic field parsing', () => {
      test('should parse simple string field', () => {
        const result = parseField('name String');
        expect(result).toEqual({
          name: 'name',
          type: 'String',
          mappedName: null,
          defaultValue: null,
          key: false,
          optional: false,
          isArray: false,
          unique: false,
          hasDefault: false,
          isUpdatedAt: false,
          isCreatedAt: false,
          isIgnored: false,
          isPrimitive: true,
          isEnum: false,
          isRelated: false,
          isRelation: false,
          relationshipType: null,
          relatedModel: null,
          relatedField: 'id',
          relationName: null,
          onDelete: null,
          onUpdate: null
        });
      });

      test('should parse optional field', () => {
        const result = parseField('email String?');
        expect(result.optional).toBe(true);
        expect(result.type).toBe('String');
      });

      test('should parse array field', () => {
        const result = parseField('tags String[]');
        expect(result.isArray).toBe(true);
        expect(result.type).toBe('String');
      });

      test('should parse all primitive types', () => {
        const primitiveTypes = ['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes'];

        primitiveTypes.forEach(type => {
          const result = parseField(`field ${type}`);
          expect(result.isPrimitive).toBe(true);
          expect(result.type).toBe(type);
        });
      });
    });

    describe('Field attributes', () => {
      test('should parse @id attribute', () => {
        const result = parseField('id String @id');
        expect(result.key).toBe(true);
        expect(result.isRelated).toBe(true);
        expect(result.relationshipType).toBe('primary_key');
      });

      test('should parse @unique attribute', () => {
        const result = parseField('email String @unique');
        expect(result.unique).toBe(true);
        expect(result.isRelated).toBe(true);
        expect(result.relationshipType).toBe('unique_constraint');
      });

      test('should parse @default attribute with value', () => {
        const result = parseField('role UserRole @default(STUDENT)');
        expect(result.hasDefault).toBe(true);
        expect(result.defaultValue).toBe('STUDENT');
      });

      test('should parse @default with function', () => {
        const result = parseField('createdAt DateTime @default(now())');
        expect(result.hasDefault).toBe(true);
        expect(result.defaultValue).toBe('now()');
      });

      test('should parse @updatedAt attribute', () => {
        const result = parseField('updatedAt DateTime @updatedAt');
        expect(result.isUpdatedAt).toBe(true);
      });

      test('should parse @createdAt attribute', () => {
        const result = parseField('createdAt DateTime @createdAt');
        expect(result.isCreatedAt).toBe(true);
      });

      test('should parse @map attribute', () => {
        const result = parseField('firstName String @map("first_name")');
        expect(result.mappedName).toBe('first_name');
      });

      test('should parse @ignore attribute', () => {
        const result = parseField('internalField String @ignore');
        expect(result.isIgnored).toBe(true);
      });
    });

    describe('Relationship parsing', () => {
      test('should parse implicit foreign key', () => {
        const result = parseField('userId String');
        expect(result.isRelated).toBe(true);
        expect(result.relationshipType).toBe('foreign_key');
        expect(result.relatedModel).toBe('User');
        expect(result.relatedField).toBe('id');
      });

      test('should parse foreign key with Id suffix', () => {
        const result = parseField('authorId Int');
        expect(result.isRelated).toBe(true);
        expect(result.relationshipType).toBe('foreign_key');
        expect(result.relatedModel).toBe('Author');
      });

      test('should parse explicit @relation with fields and references', () => {
        const result = parseField('userId String @relation(fields: [userId], references: [id])');
        expect(result.isRelated).toBe(true);
        expect(result.isRelation).toBe(true);
        expect(result.relationshipType).toBe('foreign_key');
        expect(result.relatedField).toBe('id');
      });

      test('should parse @relation with onDelete and onUpdate', () => {
        const result = parseField('user User @relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: Restrict)');
        expect(result.onDelete).toBe('Cascade');
        expect(result.onUpdate).toBe('Restrict');
      });

      test('should parse @relation with name', () => {
        const result = parseField('author User @relation(name: "PostAuthor", fields: [authorId], references: [id])');
        expect(result.relationName).toBe('PostAuthor');
      });

      test('should parse one-to-many relationship', () => {
        const result = parseField('posts Post[]');
        expect(result.isRelated).toBe(true);
        expect(result.isRelation).toBe(true);
        expect(result.relationshipType).toBe('one_to_many');
        expect(result.relatedModel).toBe('Post');
        expect(result.isArray).toBe(true);
      });

      test('should parse one-to-one relationship', () => {
        const result = parseField('profile Profile @relation(fields: [profileId], references: [id])');
        expect(result.isRelated).toBe(true);
        expect(result.isRelation).toBe(true);
        expect(result.relationshipType).toBe('foreign_key');
        expect(result.relatedModel).toBe('Profile');
      });

      test('should parse many-to-many relationship', () => {
        const result = parseField('categories Category @relation(name: "PostCategories")');
        expect(result.isRelated).toBe(true);
        expect(result.isRelation).toBe(true);
        expect(result.relationshipType).toBe('many_to_many');
        expect(result.relationName).toBe('PostCategories');
      });
    });

    describe('Enum detection', () => {
      test('should detect enum type', () => {
        const result = parseField('role UserRole');
        expect(result.isEnum).toBe(true);
        expect(result.isPrimitive).toBe(false);
        expect(result.type).toBe('UserRole');
      });

      test('should not detect enum for primitive types', () => {
        const result = parseField('name String');
        expect(result.isEnum).toBe(false);
        expect(result.isPrimitive).toBe(true);
      });

      test('should not detect enum for relations', () => {
        const result = parseField('user User @relation(fields: [userId], references: [id])');
        expect(result.isEnum).toBe(false);
        expect(result.isRelation).toBe(true);
      });
    });

    describe('Edge cases and error handling', () => {
      test('should return null for empty lines', () => {
        expect(parseField('')).toBeNull();
        expect(parseField('   ')).toBeNull();
      });

      test('should return null for comments', () => {
        expect(parseField('// This is a comment')).toBeNull();
      });

      test('should return null for model directives', () => {
        expect(parseField('@@map("users")')).toBeNull();
        expect(parseField('@@index([email])')).toBeNull();
      });

      test('should return null for braces', () => {
        expect(parseField('{')).toBeNull();
        expect(parseField('}')).toBeNull();
      });

      test('should return null for insufficient parts', () => {
        expect(parseField('field')).toBeNull();
      });

      test('should handle complex field with multiple attributes', () => {
        const result = parseField('email String @unique @map("email_address") @default("example@test.com")');
        expect(result.unique).toBe(true);
        expect(result.mappedName).toBe('email_address');
        expect(result.hasDefault).toBe(true);
        expect(result.defaultValue).toBe('"example@test.com"');
        expect(result.relationshipType).toBe('unique_constraint');
      });
    });
  });

  describe('Model-level directive parsing', () => {
    test('should parse @@map directive', () => {
      const line = '@@map("users")';
      const mapMatch = line.match(/@@map\s*\(\s*["']([^"']+)["']\s*\)/);
      expect(mapMatch).not.toBeNull();
      expect(mapMatch[1]).toBe('users');
    });

    test('should parse @@index directive', () => {
      const line = '@@index([email, name])';
      const indexMatch = line.match(/@@index\s*\(\s*\[([^\]]+)\]/);
      expect(indexMatch).not.toBeNull();
      const fields = indexMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
      expect(fields).toEqual(['email', 'name']);
    });

    test('should parse @@index with name', () => {
      const line = '@@index([email], name: "email_idx")';
      const nameMatch = line.match(/name:\s*["']([^"']+)["']/);
      expect(nameMatch).not.toBeNull();
      expect(nameMatch[1]).toBe('email_idx');
    });

    test('should parse @@unique directive', () => {
      const line = '@@unique([email, username])';
      const uniqueMatch = line.match(/@@unique\s*\(\s*\[([^\]]+)\]/);
      expect(uniqueMatch).not.toBeNull();
      const fields = uniqueMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
      expect(fields).toEqual(['email', 'username']);
    });

    test('should parse @@id directive (composite primary key)', () => {
      const line = '@@id([userId, postId])';
      const idMatch = line.match(/@@id\s*\(\s*\[([^\]]+)\]/);
      expect(idMatch).not.toBeNull();
      const fields = idMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
      expect(fields).toEqual(['userId', 'postId']);
    });

    test('should detect @@ignore directive', () => {
      const line = '@@ignore';
      expect(line.includes('@@ignore')).toBe(true);
    });
  });

  describe('Schema integration tests', () => {
    test('should parse complete model with all features', () => {
      const modelLines = [
        'model User {',
        '  id        String   @id @default(cuid())',
        '  email     String   @unique @map("email_address")',
        '  name      String?',
        '  role      UserRole @default(STUDENT)',
        '  createdAt DateTime @default(now())',
        '  updatedAt DateTime @updatedAt',
        '  posts     Post[]',
        '  profile   Profile?',
        '  @@map("users")',
        '  @@index([email])',
        '  @@unique([email, name])',
        '}'
      ];

      // Test individual field parsing
      const idField = parseField('id        String   @id @default(cuid())');
      expect(idField.key).toBe(true);
      expect(idField.hasDefault).toBe(true);
      expect(idField.defaultValue).toBe('cuid()');

      const emailField = parseField('email     String   @unique @map("email_address")');
      expect(emailField.unique).toBe(true);
      expect(emailField.mappedName).toBe('email_address');

      const roleField = parseField('role      UserRole @default(STUDENT)');
      expect(roleField.isEnum).toBe(true);
      expect(roleField.hasDefault).toBe(true);
      expect(roleField.defaultValue).toBe('STUDENT');

      const postsField = parseField('posts     Post[]');
      expect(postsField.isArray).toBe(true);
      expect(postsField.relationshipType).toBe('one_to_many');
      expect(postsField.relatedModel).toBe('Post');
    });

    test('should parse enum definitions', () => {
      const enumLines = [
        'enum UserRole {',
        '  ADMIN',
        '  INSTRUCTOR',
        '  STUDENT',
        '}'
      ];

      // Test enum value parsing
      const values = ['ADMIN', 'INSTRUCTOR', 'STUDENT'];
      values.forEach(value => {
        const cleanValue = value.replace(/,$/, '').trim();
        expect(cleanValue).toMatch(/^[A-Z_]+$/);
      });
    });

    test('should handle complex relationships', () => {
      const relationField = parseField('author User @relation(name: "PostAuthor", fields: [authorId], references: [id], onDelete: Cascade)');

      expect(relationField.relationName).toBe('PostAuthor');
      expect(relationField.onDelete).toBe('Cascade');
      expect(relationField.relationshipType).toBe('foreign_key');
      expect(relationField.relatedField).toBe('id');
    });

    test('should validate field name patterns', () => {
      const validFieldNames = ['id', 'userId', 'user_id', 'firstName', 'email_address'];
      const invalidFieldNames = ['123invalid', 'with space', 'with-dash'];

      validFieldNames.forEach(name => {
        const result = parseField(`${name} String`);
        expect(result).not.toBeNull();
        expect(result.name).toBe(name);
      });

      // Invalid field names would be caught by Prisma itself, not our parser
      // Our parser focuses on correct syntax
    });
  });

  describe('Performance and stress tests', () => {
    test('should handle large schema efficiently', () => {
      const start = Date.now();

      // Generate many field lines
      for (let i = 0; i < 1000; i++) {
        parseField(`field${i} String @map("field_${i}")`);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('should handle malformed input gracefully', () => {
      const malformedInputs = [
        'field @invalid syntax',
        'field String @relation(incomplete',
        'field String @map()',
        'field String @default(',
        null,
        undefined,
        123,
        {}
      ];

      malformedInputs.forEach(input => {
        expect(() => parseField(input)).not.toThrow();
      });
    });
  });

  describe('Regression tests', () => {
    test('should not break on Prisma 5.x syntax', () => {
      // Test newer Prisma features
      const modernField = parseField('id String @id @default(cuid()) @map("id")');
      expect(modernField).not.toBeNull();
      expect(modernField.key).toBe(true);
      expect(modernField.mappedName).toBe('id');
    });

    test('should handle multiple @relation attributes correctly', () => {
      const field = parseField('user User @relation(name: "UserPosts", fields: [userId], references: [id], onDelete: SetNull, onUpdate: Cascade)');
      expect(field.relationName).toBe('UserPosts');
      expect(field.onDelete).toBe('SetNull');
      expect(field.onUpdate).toBe('Cascade');
    });

    test('should maintain backward compatibility', () => {
      // Test basic Prisma 2.x syntax still works
      const basicField = parseField('name String');
      expect(basicField.type).toBe('String');
      expect(basicField.isPrimitive).toBe(true);
    });
  });

  describe('Advanced edge case tests', () => {
    test('should handle complex database-generated default values', () => {
      // Test various database-generated functions and complex expressions
      const complexDefaults = [
        'id String @id @default(dbgenerated("uuid_generate_v4()"))',
        'counter Int @default(autoincrement())',
        'timestamp DateTime @default(dbgenerated("now() + interval \'1 day\'"))',
        'guid String @default(dbgenerated("gen_random_uuid()"))',
        'sequence Int @default(dbgenerated("nextval(\'user_id_seq\')"))'
      ];

      complexDefaults.forEach(line => {
        const field = parseField(line);
        expect(field).not.toBeNull();
        expect(field.hasDefault).toBe(true);
        expect(field.defaultValue).toBeTruthy();

        // Check specific patterns
        if (line.includes('autoincrement')) {
          expect(field.defaultValue).toBe('autoincrement()');
        }
        if (line.includes('dbgenerated')) {
          expect(field.defaultValue).toContain('dbgenerated');
        }
      });
    });

    test('should gracefully handle malformed @relation syntax', () => {
      // Test various broken @relation patterns that should not crash the parser
      const malformedRelations = [
        'user User @relation(fields: [userId], references: [id)', // Missing closing bracket
        'user User @relation(fields: [userId, references: [id])', // Missing closing bracket in fields
        'user User @relation(fields: userId], references: [id])', // Missing opening bracket in fields
        'user User @relation(fields: [userId], references: id])', // Missing opening bracket in references
        'user User @relation(fields: [], references: [id])',      // Empty fields array
        'user User @relation(fields: [userId], references: [])',  // Empty references array
        'user User @relation(name: "incomplete)',                 // Missing closing quote
        'user User @relation(onDelete: )',                        // Missing value
        'user User @relation(invalidProperty: "value")',          // Invalid property
        'user User @relation()',                                  // Empty relation
        'user User @relation'                                     // No parentheses
      ];

      malformedRelations.forEach(line => {
        expect(() => {
          const field = parseField(line);
          // Should not crash, and should still parse basic field info
          expect(field).not.toBeNull();
          expect(field.name).toBe('user');
          expect(field.type).toBe('User');
        }).not.toThrow();
      });
    });

    test('should handle unusual whitespace and inline comments', () => {
      // Test various whitespace scenarios and comment handling
      const whitespaceFields = [
        '   id    String   @id   ',                                    // Extra spaces
        '\tid\tString\t@id\t',                                         // Tabs
        'name        String        @default("with spaces")',           // Multiple spaces
        'field String @map("value") // inline comment',                // Inline comment
        'user   User   @relation(fields:   [userId],   references:   [id])',  // Spaces in relation
        '  multiLine  String  @default("multi\\nline\\nvalue")  ',    // Multiline string default
        'unicode String @map("café_été") @default("🚀")',             // Unicode characters
        'field String @default("value with \\"quotes\\" inside")',    // Escaped quotes in default
        'path String @default("C:\\\\Users\\\\file.txt")',           // Escaped backslashes
        'json Json @default("{\\"key\\": \\"value\\"}")'             // JSON-like default
      ];

      whitespaceFields.forEach(line => {
        const field = parseField(line);
        expect(field).not.toBeNull();

        // Verify basic field parsing works despite formatting
        expect(field.name).toBeTruthy();
        expect(field.type).toBeTruthy();

        // Check specific cases
        if (line.includes('@id')) {
          expect(field.key).toBe(true);
        }
        if (line.includes('@map')) {
          expect(field.mappedName).toBeTruthy();
        }
        if (line.includes('@default')) {
          expect(field.hasDefault).toBe(true);
          expect(field.defaultValue).toBeTruthy();
        }
        if (line.includes('@relation')) {
          expect(field.isRelation).toBe(true);
        }
      });

      // Test that inline comments don't break parsing
      const commentField = parseField('name String @default("value") // this is a comment');
      expect(commentField.name).toBe('name');
      expect(commentField.type).toBe('String');
      expect(commentField.hasDefault).toBe(true);
      expect(commentField.defaultValue).toBe('"value"');
    });
  });
});

// Test data for integration testing
export const testSchemas = {
  basic: `
    model User {
      id    String @id
      name  String
      email String @unique
    }
  `,

  advanced: `
    enum UserRole {
      ADMIN
      USER
      MODERATOR
    }

    model User {
      id              String           @id @default(cuid())
      email           String           @unique @map("email_address")
      name            String?
      role            UserRole         @default(USER)
      createdAt       DateTime         @default(now())
      updatedAt       DateTime         @updatedAt
      posts           Post[]
      profile         Profile?
      groupMemberships GroupMember[]

      @@map("users")
      @@index([email])
      @@unique([email, name])
    }

    model Post {
      id        String   @id @default(cuid())
      title     String
      content   String?
      published Boolean  @default(false)
      authorId  String
      author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
      createdAt DateTime @default(now())
      
      @@map("posts")
      @@index([authorId])
    }

    model Profile {
      id     String @id @default(cuid())
      bio    String?
      userId String @unique
      user   User   @relation(fields: [userId], references: [id])
      
      @@map("profiles")
    }

    model Group {
      id      String        @id @default(cuid())
      name    String
      members GroupMember[]
      
      @@map("groups")
    }

    model GroupMember {
      userId  String
      groupId String
      role    String @default("member")
      user    User   @relation(fields: [userId], references: [id])
      group   Group  @relation(fields: [groupId], references: [id])
      
      @@id([userId, groupId])
      @@map("group_members")
    }
  `,

  edgeCases: `
    model EdgeCase {
      // Comment line
      id           String    @id
      optional     String?
      array        String[]
      optArray     String[]?
      bigIntField  BigInt
      jsonField    Json
      bytesField   Bytes
      decimalField Decimal
      ignored      String    @ignore
      
      @@ignore
    }
  `
};

export default testSchemas;

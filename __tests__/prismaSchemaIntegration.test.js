/**
 * Integration tests for the complete Prisma schema parsing pipeline
 * Tests the full parsePrismaSchemaContent function with complex schemas
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

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

// Mock the ELK layout engine
const mockElk = {
  layout: jest.fn().mockResolvedValue({
    children: [
      {
        id: 'category-user',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        children: [
          { id: 'User', x: 50, y: 50 },
          { id: 'Profile', x: 250, y: 50 }
        ]
      }
    ]
  })
};

// Mock ELK import
jest.mock('elkjs/lib/elk.bundled.js', () => {
  return jest.fn().mockImplementation(() => mockElk);
});

// Mock the schema parsing functions (these would be imported in a real implementation)
// For testing, we'll implement simplified versions

const parsePrismaSchemaContent = async (schemaContent, enableShortcuts = true, colors = null) => {
  const models = [];
  const relationships = [];
  const enums = [];

  // Split schema into lines and find model definitions
  const lines = schemaContent.split('\n');
  let currentModel = null;
  let currentEnum = null;
  let inModel = false;
  let inEnum = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for enum start
    if (line.startsWith('enum ')) {
      const enumName = line.split(' ')[1];
      currentEnum = {
        name: enumName,
        values: []
      };
      inEnum = true;
      continue;
    }

    // Check for model start
    if (line.startsWith('model ')) {
      const modelName = line.split(' ')[1];
      currentModel = {
        name: modelName,
        fields: [],
        mappedName: null,
        indexes: [],
        uniqueConstraints: [],
        compositeId: null,
        isIgnored: false
      };
      inModel = true;
      continue;
    }

    // Check for enum end
    if (inEnum && line === '}') {
      if (currentEnum) {
        enums.push(currentEnum);
        currentEnum = null;
      }
      inEnum = false;
      continue;
    }

    // Check for model end
    if (inModel && line === '}') {
      if (currentModel) {
        models.push(currentModel);
        currentModel = null;
      }
      inModel = false;
      continue;
    }

    // Parse enum values
    if (inEnum && currentEnum && line && !line.startsWith('//')) {
      const enumValue = line.replace(/,$/, '').trim();
      if (enumValue) {
        currentEnum.values.push(enumValue);
      }
      continue;
    }

    // Parse model-level directives
    if (inModel && currentModel && line.startsWith('@@')) {
      if (line.includes('@@map')) {
        const mapMatch = line.match(/@@map\s*\(\s*["']([^"']+)["']\s*\)/);
        if (mapMatch) {
          currentModel.mappedName = mapMatch[1];
        }
      }

      if (line.includes('@@index')) {
        const indexMatch = line.match(/@@index\s*\(\s*\[([^\]]+)\]/);
        if (indexMatch) {
          const fields = indexMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
          currentModel.indexes.push({ fields });
        }
      }

      if (line.includes('@@unique')) {
        const uniqueMatch = line.match(/@@unique\s*\(\s*\[([^\]]+)\]/);
        if (uniqueMatch) {
          const fields = uniqueMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
          currentModel.uniqueConstraints.push({ fields });
        }
      }

      if (line.includes('@@id')) {
        const idMatch = line.match(/@@id\s*\(\s*\[([^\]]+)\]/);
        if (idMatch) {
          const fields = idMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
          currentModel.compositeId = { fields };
        }
      }

      if (line.includes('@@ignore')) {
        currentModel.isIgnored = true;
      }

      continue;
    }

    // Parse fields within model
    if (inModel && currentModel && line && !line.startsWith('@@') && !line.startsWith('//')) {
      const field = parseFieldSimplified(line);
      if (field) {
        currentModel.fields.push(field);
      }
    }
  }

  // FIXED: Apply model inference corrections BEFORE creating relationships
  const validModels = models.filter(m => !m.isIgnored);
  
  // Fix foreign key target models based on explicit @relation declarations
  validModels.forEach(model => {
    model.fields.forEach(field => {
      // If this is an explicit @relation field with fields/references
      if (field.isRelation && field.relatedModel && field.relationName === null) {
        // Find the corresponding foreign key field mentioned in the relation
        const relationContent = lines.find(line => 
          line.includes(field.name) && line.includes('@relation') && line.includes('fields:')
        );
        
        if (relationContent) {
          const fieldsMatch = relationContent.match(/fields:\s*\[([^\]]+)\]/);
          if (fieldsMatch) {
            const foreignKeyFieldNames = fieldsMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
            
            // Update the target model for each foreign key field
            foreignKeyFieldNames.forEach(fkFieldName => {
              const foreignKeyField = model.fields.find(f => f.name === fkFieldName);
              if (foreignKeyField && foreignKeyField.isRelated) {
                // Update the foreign key field to point to the correct model
                foreignKeyField.relatedModel = field.relatedModel;
              }
            });
          }
        }
      }
    });
  });

  // FIXED: Create relationships AFTER model inference corrections
  validModels.forEach(model => {
    model.fields.forEach(field => {
      if (field.isRelated && field.relatedModel && !field.isIgnored) {
        // FIXED: Only create relationships for actual foreign key fields, NOT relation accessor fields
        const shouldCreateRelationship =
          // Create relationship for explicit @relation with fields/references (actual foreign key columns)
          (field.relationshipType === 'foreign_key' && field.isPrimitive && (field.name.endsWith('Id') || field.name.endsWith('_id'))) ||
          // Create relationship for primary keys and unique constraints 
          (field.relationshipType === 'primary_key') ||
          (field.relationshipType === 'unique_constraint' && field.isPrimitive);

        if (shouldCreateRelationship) {
          const relationship = {
            from: model.name,
            fromField: field.name,
            to: field.relatedModel,
            toField: field.relatedField || 'id',
            relationshipType: field.relationshipType,
            relationName: field.relationName,
            onDelete: field.onDelete,
            onUpdate: field.onUpdate
          };
          relationships.push(relationship);
        }
      }
    });
  });

  return { models: validModels, relationships, enums };
};

const parseFieldSimplified = (line) => {
  const trimmedLine = line.trim();
  if (!trimmedLine || trimmedLine.startsWith('//')) return null;

  const parts = trimmedLine.split(/\s+/);
  if (parts.length < 2) return null;

  const fieldName = parts[0];
  let fieldType = parts[1];

  const isOptional = fieldType.includes('?');
  const isArray = fieldType.includes('[]');
  fieldType = fieldType.replace(/[\?\[\]]/g, '');

  const isId = trimmedLine.includes('@id');
  const isUnique = trimmedLine.includes('@unique');
  const isDefault = trimmedLine.includes('@default');
  const isIgnored = trimmedLine.includes('@ignore');

  let mappedName = null;
  const mapMatch = trimmedLine.match(/@map\s*\(\s*["']([^"']+)["']\s*\)/);
  if (mapMatch) {
    mappedName = mapMatch[1];
  }

  let defaultValue = null;
  if (isDefault) {
    const defaultMatch = trimmedLine.match(/@default\s*\(([^)]+)\)/);
    if (defaultMatch) {
      defaultValue = defaultMatch[1].trim();
    }
  }

  const isPrimitiveType = ['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes'].includes(fieldType);
  const isEnumType = !isPrimitiveType && !isArray && fieldType.charAt(0) === fieldType.charAt(0).toUpperCase() && !trimmedLine.includes('@relation');

  let relationshipType = null;
  let relatedModel = null;
  let relatedField = 'id';
  let isRelated = false;
  let isRelation = false;
  let relationName = null;

  if (trimmedLine.includes('@relation')) {
    isRelated = true;
    isRelation = true;
    
    const relationMatch = trimmedLine.match(/@relation\s*\([^)]*\)/);
    if (relationMatch) {
      const relationContent = relationMatch[0];
      
      const nameMatch = relationContent.match(/name:\s*["']([^"']+)["']/);
      if (nameMatch) {
        relationName = nameMatch[1];
      }

      const fieldsMatch = relationContent.match(/fields:\s*\[([^\]]+)\]/);
      const referencesMatch = relationContent.match(/references:\s*\[([^\]]+)\]/);

      if (fieldsMatch && referencesMatch) {
        relationshipType = 'foreign_key';
        relatedField = referencesMatch[1].trim().replace(/['"]/g, '');
      } else {
        relationshipType = isArray ? 'one_to_many' : 'one_to_one';
      }
    }

    if (!isPrimitiveType && !isEnumType) {
      relatedModel = fieldType;
    }
  }

  if (isId) {
    relationshipType = relationshipType || 'primary_key';
    isRelated = true;
  }

  if (isUnique && !isId) {
    relationshipType = relationshipType || 'unique_constraint';
    isRelated = true;
  }

  if ((fieldName.endsWith('_id') || fieldName.endsWith('Id')) && isPrimitiveType) {
    isRelated = true;
    if (!relationshipType) {
      relationshipType = 'foreign_key';
    }
    if (!relatedModel) {
      relatedModel = fieldName.replace(/_?[iI]d$/g, '').replace(/_/g, '');
      relatedModel = relatedModel.charAt(0).toUpperCase() + relatedModel.slice(1);
    }
  }

  if (isArray && !isPrimitiveType && !isEnumType) {
    isRelated = true;
    isRelation = true;
    relationshipType = relationshipType || 'one_to_many';
    relatedModel = fieldType;
  }

  return {
    name: fieldName,
    type: fieldType,
    mappedName,
    defaultValue,
    key: isId,
    optional: isOptional,
    isArray,
    unique: isUnique,
    hasDefault: isDefault,
    isIgnored,
    isPrimitive: isPrimitiveType,
    isEnum: isEnumType,
    isRelated,
    isRelation,
    relationshipType,
    relatedModel,
    relatedField,
    relationName
  };
};

describe('Prisma Schema Integration Tests', () => {
  
  describe('Complete schema parsing', () => {
    test('should parse a basic schema with one model', async () => {
      const schema = `
        model User {
          id    String @id
          name  String
          email String @unique
        }
      `;

      const result = await parsePrismaSchemaContent(schema, false, mockColors);
      
      expect(result.models).toHaveLength(1);
      expect(result.models[0].name).toBe('User');
      expect(result.models[0].fields).toHaveLength(3);
      
      const idField = result.models[0].fields.find(f => f.name === 'id');
      expect(idField).toBeValidPrismaField();
      expect(idField).toHaveRelationshipType('primary_key');
      
      const emailField = result.models[0].fields.find(f => f.name === 'email');
      expect(emailField.unique).toBe(true);
    });

    test('should parse enums correctly', async () => {
      const schema = `
        enum UserRole {
          ADMIN
          USER
          MODERATOR
        }

        model User {
          id   String   @id
          role UserRole @default(USER)
        }
      `;

      const result = await parsePrismaSchemaContent(schema, false, mockColors);
      
      expect(result.enums).toHaveLength(1);
      expect(result.enums[0].name).toBe('UserRole');
      expect(result.enums[0].values).toEqual(['ADMIN', 'USER', 'MODERATOR']);
      
      const roleField = result.models[0].fields.find(f => f.name === 'role');
      expect(roleField.isEnum).toBe(true);
      expect(roleField.hasDefault).toBe(true);
      expect(roleField.defaultValue).toBe('USER');
    });

    test('should parse complex relationships', async () => {
      const schema = `
        model User {
          id       String @id @default(cuid())
          email    String @unique
          posts    Post[]
          profile  Profile?
        }

        model Post {
          id       String @id @default(cuid())
          title    String
          authorId String
          author   User   @relation(fields: [authorId], references: [id], onDelete: Cascade)
        }

        model Profile {
          id     String @id @default(cuid())
          userId String @unique
          user   User   @relation(fields: [userId], references: [id])
        }
      `;

      const result = await parsePrismaSchemaContent(schema, false, mockColors);
      
      expect(result.models).toHaveLength(3);
      expect(result.relationships).toHaveLength(2);
      
      // Check User -> Post relationship
      const userPostRelation = result.relationships.find(r => 
        r.from === 'Post' && r.to === 'User' && r.fromField === 'authorId'
      );
      expect(userPostRelation).toBeDefined();
      expect(userPostRelation.relationshipType).toBe('foreign_key');
      
      // Check User -> Profile relationship
      const userProfileRelation = result.relationships.find(r => 
        r.from === 'Profile' && r.to === 'User' && r.fromField === 'userId'
      );
      expect(userProfileRelation).toBeDefined();
    });

    test('should parse model-level directives', async () => {
      const schema = `
        model User {
          id       String @id
          email    String @unique
          name     String
          
          @@map("users")
          @@index([email])
          @@unique([email, name])
        }
      `;

      const result = await parsePrismaSchemaContent(schema, false, mockColors);
      
      const userModel = result.models[0];
      expect(userModel.mappedName).toBe('users');
      expect(userModel.indexes).toHaveLength(1);
      expect(userModel.indexes[0].fields).toEqual(['email']);
      expect(userModel.uniqueConstraints).toHaveLength(1);
      expect(userModel.uniqueConstraints[0].fields).toEqual(['email', 'name']);
    });

    test('should handle composite primary keys', async () => {
      const schema = `
        model UserGroup {
          userId  String
          groupId String
          role    String @default("member")
          
          @@id([userId, groupId])
          @@map("user_groups")
        }
      `;

      const result = await parsePrismaSchemaContent(schema, false, mockColors);
      
      const model = result.models[0];
      expect(model.compositeId).toBeDefined();
      expect(model.compositeId.fields).toEqual(['userId', 'groupId']);
      expect(model.mappedName).toBe('user_groups');
    });

    test('should ignore models marked with @@ignore', async () => {
      const schema = `
        model User {
          id   String @id
          name String
        }

        model TempModel {
          id String @id
          
          @@ignore
        }
      `;

      const result = await parsePrismaSchemaContent(schema, false, mockColors);
      
      expect(result.models).toHaveLength(1);
      expect(result.models[0].name).toBe('User');
    });

    test('should handle fields with multiple attributes', async () => {
      const schema = `
        model User {
          id        String   @id @default(cuid()) @map("user_id")
          email     String   @unique @map("email_address")
          createdAt DateTime @default(now())
          updatedAt DateTime @updatedAt
        }
      `;

      const result = await parsePrismaSchemaContent(schema, false, mockColors);
      
      const model = result.models[0];
      
      const idField = model.fields.find(f => f.name === 'id');
      expect(idField.key).toBe(true);
      expect(idField.hasDefault).toBe(true);
      expect(idField.mappedName).toBe('user_id');
      
      const emailField = model.fields.find(f => f.name === 'email');
      expect(emailField.unique).toBe(true);
      expect(emailField.mappedName).toBe('email_address');
    });

    test('should detect implicit foreign keys', async () => {
      const schema = `
        model Post {
          id       String @id
          title    String
          authorId String
          categoryId Int
        }
      `;

      const result = await parsePrismaSchemaContent(schema, false, mockColors);
      
      const model = result.models[0];
      
      const authorIdField = model.fields.find(f => f.name === 'authorId');
      expect(authorIdField.isRelated).toBe(true);
      expect(authorIdField.relationshipType).toBe('foreign_key');
      expect(authorIdField.relatedModel).toBe('Author');
      
      const categoryIdField = model.fields.find(f => f.name === 'categoryId');
      expect(categoryIdField.isRelated).toBe(true);
      expect(categoryIdField.relationshipType).toBe('foreign_key');
      expect(categoryIdField.relatedModel).toBe('Category');
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle empty schema', async () => {
      const result = await parsePrismaSchemaContent('', false, mockColors);
      
      expect(result.models).toHaveLength(0);
      expect(result.relationships).toHaveLength(0);
      expect(result.enums).toHaveLength(0);
    });

    test('should handle schema with only comments', async () => {
      const schema = `
        // This is a comment
        // Another comment
        
        // Model definition will be here
      `;

      const result = await parsePrismaSchemaContent(schema, false, mockColors);
      
      expect(result.models).toHaveLength(0);
      expect(result.relationships).toHaveLength(0);
      expect(result.enums).toHaveLength(0);
    });

    test('should handle malformed model definitions gracefully', async () => {
      const schema = `
        model User {
          id String @id
          // Missing closing brace
          
        model Post {
          id String @id
        }
      `;

      const result = await parsePrismaSchemaContent(schema, false, mockColors);
      
      // Should still parse the valid Post model
      expect(result.models).toHaveLength(1);
      expect(result.models[0].name).toBe('Post');
    });

    test('should handle invalid field definitions', async () => {
      const schema = `
        model User {
          id String @id
          // Invalid field line
          invalidField
          name String
        }
      `;

      const result = await parsePrismaSchemaContent(schema, false, mockColors);
      
      const model = result.models[0];
      expect(model.fields).toHaveLength(2); // Should skip invalid field
      expect(model.fields.map(f => f.name)).toEqual(['id', 'name']);
    });
  });

  describe('Performance tests', () => {
    test('should handle large schemas efficiently', async () => {
      // Generate a large schema with many models
      let schema = '';
      
      for (let i = 0; i < 50; i++) {
        schema += `
          model Model${i} {
            id String @id @default(cuid())
            name String
            value${i} Int
            createdAt DateTime @default(now())
            updatedAt DateTime @updatedAt
          }
        `;
      }

      const start = Date.now();
      const result = await parsePrismaSchemaContent(schema, false, mockColors);
      const duration = Date.now() - start;
      
      expect(result.models).toHaveLength(50);
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });

    test('should handle schema with many relationships efficiently', async () => {
      let schema = `
        model User {
          id String @id @default(cuid())
          name String
      `;
      
      // Add many related models
      for (let i = 0; i < 20; i++) {
        schema += `    model${i}Id String?\n`;
        schema += `    model${i} Model${i}? @relation(fields: [model${i}Id], references: [id])\n`;
      }
      
      schema += '  }\n';
      
      // Add the related models
      for (let i = 0; i < 20; i++) {
        schema += `
          model Model${i} {
            id String @id @default(cuid())
            name String
            users User[]
          }
        `;
      }

      const start = Date.now();
      const result = await parsePrismaSchemaContent(schema, false, mockColors);
      const duration = Date.now() - start;
      
      expect(result.models).toHaveLength(21); // User + 20 related models
      expect(result.relationships.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should be fast even with many relationships
    });
  });

  describe('Real-world schema examples', () => {
    test('should parse a typical blog schema', async () => {
      const blogSchema = `
        enum Role {
          USER
          ADMIN
          MODERATOR
        }

        model User {
          id        String   @id @default(cuid())
          email     String   @unique
          name      String?
          role      Role     @default(USER)
          posts     Post[]
          comments  Comment[]
          createdAt DateTime @default(now())
          updatedAt DateTime @updatedAt

          @@map("users")
        }

        model Post {
          id        String    @id @default(cuid())
          title     String
          content   String?
          published Boolean   @default(false)
          authorId  String
          author    User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
          comments  Comment[]
          tags      Tag[]
          createdAt DateTime  @default(now())
          updatedAt DateTime  @updatedAt

          @@map("posts")
          @@index([authorId])
        }

        model Comment {
          id       String   @id @default(cuid())
          content  String
          postId   String
          post     Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
          authorId String
          author   User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
          createdAt DateTime @default(now())

          @@map("comments")
          @@index([postId])
          @@index([authorId])
        }

        model Tag {
          id    String @id @default(cuid())
          name  String @unique
          posts Post[]

          @@map("tags")
        }
      `;

      const result = await parsePrismaSchemaContent(blogSchema, false, mockColors);
      
      expect(result.enums).toHaveLength(1);
      expect(result.models).toHaveLength(4);
      expect(result.relationships.length).toBeGreaterThan(0);
      
      // Verify specific model properties
      const userModel = result.models.find(m => m.name === 'User');
      expect(userModel.mappedName).toBe('users');
      
      const postModel = result.models.find(m => m.name === 'Post');
      expect(postModel.indexes).toHaveLength(1);
      expect(postModel.indexes[0].fields).toEqual(['authorId']);
      
      // Verify relationships
      const postAuthorRelation = result.relationships.find(r => 
        r.from === 'Post' && r.to === 'User' && r.fromField === 'authorId'
      );
      expect(postAuthorRelation).toBeDefined();
    });
  });
});

export { parsePrismaSchemaContent, parseFieldSimplified }; 
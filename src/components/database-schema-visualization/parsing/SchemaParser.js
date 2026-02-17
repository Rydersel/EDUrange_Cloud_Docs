"use client";

import { getThemeColors } from '../theme/ThemeSystem';

// Prisma Schema Parser
export const parsePrismaSchema = async (enableShortcuts = true, colors = null, config = null) => {
  try {
    // Construct API URL with schema path parameter
    const apiUrl = config?.apiEndpoint || '/api/parse-schema';
    const schemaPath = config?.schemaPath || 'schema.prisma';
    const url = `${apiUrl}?path=${encodeURIComponent(schemaPath)}`;

    console.log(`📄 Fetching schema from: ${schemaPath} via ${apiUrl}`);

    // Read the schema file
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch schema (${response.status})`);
    }
    const schemaContent = await response.text();

    return await parsePrismaSchemaContent(schemaContent, enableShortcuts, colors);
  } catch (error) {
    console.error('Error parsing Prisma schema:', error);
    console.warn('Falling back to placeholder data');
    // Fallback to placeholder data if schema parsing fails
    return await createPlaceholderData(enableShortcuts, colors);
  }
};

export const parseField = (line) => {
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

export const parsePrismaSchemaContent = async (schemaContent, enableShortcuts = true, colors = null) => {
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
      const enumValue = line.replace(/,$/, '').trim(); // Remove trailing comma
      if (enumValue) {
        currentEnum.values.push(enumValue);
      }
      continue;
    }

    // Parse model-level directives
    if (inModel && currentModel && line.startsWith('@@')) {
      // Parse @@map directive
      if (line.includes('@@map')) {
        const mapMatch = line.match(/@@map\s*\(\s*["']([^"']+)["']\s*\)/);
        if (mapMatch) {
          currentModel.mappedName = mapMatch[1];
        }
      }

      // Parse @@index directive
      if (line.includes('@@index')) {
        const indexMatch = line.match(/@@index\s*\(\s*\[([^\]]+)\]/);
        if (indexMatch) {
          const fields = indexMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));

          // Parse index name if provided
          let indexName = null;
          const nameMatch = line.match(/name:\s*["']([^"']+)["']/);
          if (nameMatch) {
            indexName = nameMatch[1];
          }

          // Parse index type if provided
          let indexType = 'BTree'; // Default
          const typeMatch = line.match(/type:\s*(\w+)/);
          if (typeMatch) {
            indexType = typeMatch[1];
          }

          currentModel.indexes.push({
            fields,
            name: indexName,
            type: indexType
          });
        }
      }

      // Parse @@unique directive
      if (line.includes('@@unique')) {
        const uniqueMatch = line.match(/@@unique\s*\(\s*\[([^\]]+)\]/);
        if (uniqueMatch) {
          const fields = uniqueMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));

          // Parse constraint name if provided
          let constraintName = null;
          const nameMatch = line.match(/name:\s*["']([^"']+)["']/);
          if (nameMatch) {
            constraintName = nameMatch[1];
          }

          currentModel.uniqueConstraints.push({
            fields,
            name: constraintName
          });
        }
      }

      // Parse @@id directive (composite primary key)
      if (line.includes('@@id')) {
        const idMatch = line.match(/@@id\s*\(\s*\[([^\]]+)\]/);
        if (idMatch) {
          const fields = idMatch[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
          currentModel.compositeId = {
            fields,
            name: null
          };

          // Parse composite key name if provided
          const nameMatch = line.match(/name:\s*["']([^"']+)["']/);
          if (nameMatch) {
            currentModel.compositeId.name = nameMatch[1];
          }
        }
      }

      // Parse @@ignore directive
      if (line.includes('@@ignore')) {
        currentModel.isIgnored = true;
      }

      continue;
    }

    // Parse fields within model
    if (inModel && currentModel && line && !line.startsWith('@@') && !line.startsWith('//')) {
      const field = parseField(line);
      if (field) {
        currentModel.fields.push(field);

        // Create relationships based on enhanced field parsing
        if (field.isRelated && field.relatedModel && !field.isIgnored) {
          // FIXED: More exclusive relationship creation to prevent duplicates
          const shouldCreateRelationship =
            // Create relationship for explicit @relation with fields/references (actual foreign key columns)
            (field.relationshipType === 'foreign_key' && line.includes('@relation') && line.includes('fields:')) ||
            // Create relationship for implicit foreign keys (authorId, userId, etc.) ONLY if no explicit @relation AND no other relation field exists
            ((field.name.endsWith('Id') || field.name.endsWith('_id')) && !line.includes('@relation')) ||
            // Create relationship for primary keys and unique constraints
            (field.relationshipType === 'primary_key') ||
            (field.relationshipType === 'unique_constraint');

          if (shouldCreateRelationship) {
            const relationship = {
              from: currentModel.name,
              fromField: field.name,
              to: field.relatedModel,
              toField: field.relatedField || 'id',
              relationshipType: field.relationshipType,
              relationName: field.relationName,
              onDelete: field.onDelete,
              onUpdate: field.onUpdate
            };
            relationships.push(relationship);
            console.log('Found relationship:', relationship);
          }
        }
      }
    }
  }

  // Filter out ignored models
  const validModels = models.filter(model => !model.isIgnored);

  // Mark composite primary key fields
  validModels.forEach(model => {
    if (model.compositeId) {
      model.compositeId.fields.forEach(fieldName => {
        const field = model.fields.find(f => f.name === fieldName);
        if (field) {
          field.key = true;
          field.isRelated = true;
          field.relationshipType = field.relationshipType || 'primary_key';
        }
      });
    }
  });

  // Mark fields that are part of unique constraints
  validModels.forEach(model => {
    model.uniqueConstraints.forEach(constraint => {
      constraint.fields.forEach(fieldName => {
        const field = model.fields.find(f => f.name === fieldName);
        if (field && !field.key) { // Don't override primary keys
          field.unique = true;
          field.isRelated = true;
          field.relationshipType = field.relationshipType || 'unique_constraint';
        }
      });
    });
  });

  // Remove duplicate relationships
  const uniqueRelationships = relationships.filter((rel, index, self) =>
    index === self.findIndex(r =>
      r.from === rel.from && r.fromField === rel.fromField &&
      r.to === rel.to && r.toField === rel.toField
    )
  );

  // Now ensure all fields referenced in relationships have isRelated = true
  uniqueRelationships.forEach(rel => {
    // Find the source model and ensure the source field is marked as related
    const sourceModel = validModels.find(m => m.name === rel.from);
    if (sourceModel) {
      const sourceField = sourceModel.fields.find(f => f.name === rel.fromField);
      if (sourceField) {
        sourceField.isRelated = true;
      }
    }

    // Find the target model and ensure the target field is marked as related
    const targetModel = validModels.find(m => m.name === rel.to);
    if (targetModel) {
      const targetField = targetModel.fields.find(f => f.name === rel.toField);
      if (targetField) {
        targetField.isRelated = true;
      }
    }
  });

  console.log('All found relationships:', uniqueRelationships);
  console.log('Total models found:', validModels.length);
  console.log('Model names:', validModels.map(m => m.name));
  console.log('Enums found:', enums.map(e => e.name));
  console.log('Models with indexes:', validModels.filter(m => m.indexes.length > 0).map(m => ({ name: m.name, indexes: m.indexes })));
  console.log('Models with unique constraints:', validModels.filter(m => m.uniqueConstraints.length > 0).map(m => ({ name: m.name, constraints: m.uniqueConstraints })));
  console.log('Models with composite IDs:', validModels.filter(m => m.compositeId).map(m => ({ name: m.name, compositeId: m.compositeId })));

  // Import convertToReactFlowFormat dynamically to avoid circular dependency
  const { convertToReactFlowFormat } = await import('../utils/ReactFlowUtils');
  return await convertToReactFlowFormat(validModels, uniqueRelationships, enableShortcuts, colors, enums);
};

// Keep placeholder data as fallback
export const createPlaceholderData = async (enableShortcuts = true, colors = null) => {
  const models = [
    {
      name: 'User',
      fields: [
        { name: 'id', type: 'String', isPrimaryKey: true, isRelated: true },
        { name: 'name', type: 'String' },
        { name: 'email', type: 'String' },
        { name: 'role', type: 'UserRole' },
        { name: 'createdAt', type: 'DateTime' },
      ]
    },
    {
      name: 'CompetitionGroup',
      fields: [
        { name: 'id', type: 'String', isPrimaryKey: true, isRelated: true },
        { name: 'name', type: 'String' },
        { name: 'description', type: 'String' },
        { name: 'startDate', type: 'DateTime' },
        { name: 'endDate', type: 'DateTime' },
      ]
    }
  ];

  const relationships = [
    {
      from: 'User',
      fromField: 'id',
      to: 'CompetitionGroup',
      toField: 'id'
    }
  ];

  // Import convertToReactFlowFormat dynamically to avoid circular dependency
  const { convertToReactFlowFormat } = await import('../utils/ReactFlowUtils');
  return await convertToReactFlowFormat(models, relationships, enableShortcuts, colors);
}; 
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    // Get schema path from query parameter, default to 'schema.prisma'
    const schemaPath = req.query.path || 'schema.prisma';
    
    // Validate the path to prevent directory traversal attacks
    if (schemaPath.includes('..') || schemaPath.includes('/') || schemaPath.includes('\\')) {
      res.status(400).json({ 
        error: 'Invalid schema path. Path must be a simple filename in the project root.' 
      });
      return;
    }
    
    // Construct full path to the schema file
    const fullSchemaPath = path.join(process.cwd(), schemaPath);
    
    // Check if file exists
    if (!fs.existsSync(fullSchemaPath)) {
      res.status(404).json({ 
        error: `Schema file not found: ${schemaPath}`,
        path: fullSchemaPath 
      });
      return;
    }
    
    // Read the schema file
    const schemaContent = fs.readFileSync(fullSchemaPath, 'utf8');
    
    // Log successful read for debugging
    console.log(`📄 Schema loaded from: ${schemaPath}`);
    
    // Return the content as plain text
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(schemaContent);
    
  } catch (error) {
    console.error('Error reading schema file:', error);
    res.status(500).json({ 
      error: 'Failed to read schema file',
      details: error.message 
    });
  }
} 